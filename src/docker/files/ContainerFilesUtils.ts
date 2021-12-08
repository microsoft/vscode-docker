/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as objectSupport from 'dayjs/plugin/objectSupport';
import * as utc from 'dayjs/plugin/utc';
import * as path from 'path';
import { localize } from '../../localize';
import { DockerExecCommandProvider } from '../DockerApiClient';

dayjs.extend(objectSupport);
dayjs.extend(utc);

export type DirectoryItemType = 'directory' | 'file';

export interface DirectoryItem {
    name: string;
    path: string;
    type: DirectoryItemType;
}

export class UnrecognizedDirectoryItemTypeError extends Error {
    public constructor() {
        super(localize('docker.files.containerFilesUtils.unrecognizedDirectoryItemType', 'Unrecognized directory item type.'));
    }
}

export type DockerContainerExecutor = (command: string[] | DockerExecCommandProvider, user?: string) => Promise<string>;

function parseLinuxName(name: string): string {
    const expression = /(?<name>.+)(?= -> )/g;
    const match = expression.exec(name);

    if (match !== null) {
        return match.groups.name;
    }

    return name;
}

function parseLinuxType(type: string): DirectoryItemType {
    switch (type) {
        case 'd': return 'directory';
        default:
            return 'file';
    }
}

function parseLinuxDirectoryItems(input: string, parentPath: string): DirectoryItem[] {
    const expression = /^(?<type>[bcdDlps-])(?<perm>[r-][w-][sStTx-]){3}\s+(?<links>\d+)\s+(?<owner>[a-z0-9_.][a-z0-9_.-]*\$?)\s+(?<group>[a-z0-9_.][a-z0-9_.-]*\$?)\s+(?<size>\d+(, \d+)?)\s+(?<date>\w+\s+\d+)\s+(?<yearOrTime>\d{4}|\d{1,2}:\d{2})\s+(?<name>.*)$/gm;

    let match = expression.exec(input);

    const items: DirectoryItem[] = [];

    while (match !== null) {
        const name = parseLinuxName(match.groups.name);
        const type = parseLinuxType(match.groups.type);

        match = expression.exec(input);

        //
        // NOTE: Do not use `match` below this point.
        //

        // Ignore relative directory items...
        if (type === 'directory' && (name === '.' || name === '..')) {
            continue;
        }

        items.push(
            {
                name,
                path: path.posix.join(parentPath, name),
                type
            });
    }

    return items;
}

const users = [
    /* Default user */ undefined,
    'ContainerAdministrator',
    'Administrator'
];

function parseWindowsName(dirOrSize: string, name: string): string {
    const symlinkPlaceholder = '<SYMLINKD>';

    if (dirOrSize === symlinkPlaceholder) {
        const expression = /(?<name>.+)(?= \[)/g;
        const match = expression.exec(name);

        if (match !== null) {
            return match.groups.name;
        }
    }

    return name;
}

function parseWindowsType(dirOrSize: string): DirectoryItemType {
    const size = Number.parseInt(dirOrSize, 10);

    return Number.isNaN(size) ? 'directory' : 'file';
}

function parseWindowsDirectoryItems(input: string, parentPath: string): DirectoryItem[] {
    const expression = /^(?<date>\d{1,2}\/\d{1,2}\/\d{4})\s+(?<time>\d{1,2}:\d{1,2}( (AM|PM))?)\s+(?<dirOrSize><DIR>|<SYMLINKD>|\d+)\s+(?<name>.*)$/gm;

    let match = expression.exec(input);

    const items: DirectoryItem[] = [];

    while (match !== null) {
        const name = parseWindowsName(match.groups.dirOrSize, match.groups.name);
        const type = parseWindowsType(match.groups.dirOrSize);

        match = expression.exec(input);

        //
        // NOTE: Do not use `match` below this point.
        //

        // Ignore relative directory items...
        if (type === 'directory' && (name === '.' || name === '..')) {
            continue;
        }

        items.push(
            {
                name,
                path: path.posix.join(parentPath, name),
                type
            });
    }

    return items;
}

export async function listLinuxContainerDirectory(executor: DockerContainerExecutor, parentPath: string): Promise<DirectoryItem[]> {
    const commandProvider: DockerExecCommandProvider = shell => {
        return shell === 'windows'
            ? ['/bin/sh', '-c', `"ls -la '${parentPath}'"`]
            : ['/bin/sh', '-c', `ls -la "${parentPath}"`];
    };

    const output = await executor(commandProvider);

    return parseLinuxDirectoryItems(output, parentPath);
}

async function tryWithItems<T, U>(items: T[], callback: (item: T) => Promise<U | undefined>): Promise<U | undefined> {
    let lastErr;

    for (const item of items) {
        try {
            const result = await callback(item);

            if (result !== undefined) {
                return result;
            }
        } catch (err) {
            lastErr = err;
        }
    }

    if (lastErr) {
        throw lastErr;
    }

    return undefined;
}

export async function listWindowsContainerDirectory(executor: DockerContainerExecutor, parentPath: string): Promise<DirectoryItem[]> {
    const command = ['cmd', '/C', `dir /A-S /-C "${parentPath}"`];

    const output = await tryWithItems(
        users,
        async user => await executor(command, user));

    return parseWindowsDirectoryItems(output, parentPath);
}

export interface DirectoryItemStat {
    ctime: number;
    mtime: number;
    size: number;
    type: DirectoryItemType
}

export async function statLinuxContainerItem(executor: DockerContainerExecutor, itemPath: string): Promise<DirectoryItemStat | undefined> {
    const command: DockerExecCommandProvider =
        shell => {
            return shell === 'windows'
                ? ['/bin/sh', '-c', `"stat -c '%W;%Y;%s;%F' '${itemPath}'"`]
                : ['/bin/sh', '-c', `stat -c "%W;%Y;%s;%F" "${itemPath}"`];
        };

    const result = await executor(command);

    // NOTE: stat() (i.e. '%W' and "%Y') reports time in seconds since the epoch; VS Code requires milliseconds since the epoch.
    //       stat() on BusyBox doesn't support the '%W' option, returning 'W' instead.

    const statRegex = /^(?<ctime>\d+|[W]);(?<mtime>\d+);(?<size>\d+);(?<type>.+)$/g;

    const statMatch = statRegex.exec(result);

    if (statMatch) {
        return {
            ctime: statMatch.groups.ctime !== 'W' ? parseInt(statMatch.groups.ctime, 10) * 1000 : 0,
            mtime: parseInt(statMatch.groups.mtime, 10) * 1000,
            size: parseInt(statMatch.groups.size, 10),
            type: statMatch.groups.type === 'directory' ? 'directory' : 'file'
        };
    }

    return undefined;
}

export async function statWindowsContainerItem(executor: DockerContainerExecutor, itemPath: string, itemType: DirectoryItemType): Promise<DirectoryItemStat | undefined> {
    // This PowerShell command is a bit complicated; to break it down:
    // Get file info and store in $finfo variable:
    //     $finfo = Get-Item -Path '${itemPath}';
    // Output formatted like Linux above:
    //     Write-Output ('{0};{1};{2};{3}' -f ...
    // Emit the file timestamp from Unix time in milliseconds:
    //     ([System.DateTimeOffset]$finfo.CreationTimeUtc).ToUnixTimeMilliseconds()
    // PS 5.0 lacks a ternary, so this creates a two-element array and uses the true/false value as an index:
    //     @('file','directory')[$finfo.PSIsContainer]
    const command: string[] = ['powershell', '-Command', `$finfo = Get-Item -Path '${itemPath}'; Write-Output ('{0};{1};{2};{3}' -f ([System.DateTimeOffset]$finfo.CreationTimeUtc).ToUnixTimeMilliseconds(), ([System.DateTimeOffset]$finfo.LastWriteTimeUtc).ToUnixTimeMilliseconds(), $finfo.Length, @('file','directory')[$finfo.PSIsContainer])`];

    try {
        const result = await tryWithItems(
            users,
            user => executor(command, user)
        );

        const statRegex = /^(?<ctime>\d+);(?<mtime>\d+);(?<size>\d+);(?<type>.+)$/g;

        const statMatch = statRegex.exec(result);

        if (statMatch) {
            return {
                ctime: parseInt(statMatch.groups.ctime, 10),
                mtime: parseInt(statMatch.groups.mtime, 10),
                size: parseInt(statMatch.groups.size, 10),
                type: statMatch.groups.type as DirectoryItemType,
            };
        }
    } catch {
        // NOTE: Not every Windows container contains PowerShell (e.g. Nanoserver used for .NET Core apps);
        //       if the call fails, assume it isn't installed and fake a "recently updated" file or directory.
        return {
            ctime: 0,
            mtime: Date.now(),
            size: 0,
            type: itemType,
        };
    }

    return undefined;
}
