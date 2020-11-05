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
            ? ['/bin/sh', '-c', `"ls -la \"${parentPath}\""` ]
            : ['/bin/sh', '-c', `ls -la "${parentPath}"` ];
    };

    const output = await executor(commandProvider);

    return parseLinuxDirectoryItems(output, parentPath);
}

export async function listWindowsContainerDirectory(executor: DockerContainerExecutor, parentPath: string): Promise<DirectoryItem[]> {
    const command = ['cmd', '/C', `dir /A-S /-C "${parentPath}"` ];

    let output: string;

    try {
        // Try the listing with the default user...
        output = await executor(command);
    } catch {
        try {
            // If that fails, try another well-known user...
            output = await executor(command, 'ContainerAdministrator');
        } catch {
            // If *that* fails, try a last well-known user...
            output = await executor(command, 'Administrator');
        }
    }

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
                ? [ '/bin/sh', '-c', `"stat -c '%W;%Y;%s;%F' '${itemPath}'"` ]
                : [ '/bin/sh', '-c', `stat -c "%W;%Y;%s;%F" "${itemPath}"` ];
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

function parseWmiList(wmiList: string): { [key: string]: string } | undefined {
    const lines = wmiList.replace(/[\r]+/g, '').split('\n');

    let parsedObject: { [key: string]: string };

    for (const line of lines) {
        const index = line.indexOf('=');

        if (index > 0) {
            const name = line.substr(0, index);
            const value = line.substr(index + 1);

            if (parsedObject === undefined) {
                parsedObject = {};
            }

            parsedObject[name] = value;
        }
    }

    return parsedObject;
}

function parseWmiTime(wmiTime: string): number | undefined {
    if (wmiTime) {
        const match = /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})(?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})\.(?<micro>\d{6})(?<offset>[+-]\d{3})$/.exec(wmiTime);

        if (match) {

            const options = {
                year: parseInt(match.groups.year, 10),
                month: parseInt(match.groups.month, 10) - 1,
                day: parseInt(match.groups.day, 10),
                hour: parseInt(match.groups.hour, 10),
                minute: parseInt(match.groups.minute, 10),
                second: parseInt(match.groups.second, 10),
                millisecond: parseInt(match.groups.micro, 10) / 1000
            };

            // TODO: Add ObjectSupport constructor to type definitions.
            const time = dayjs(<dayjs.ConfigType><unknown>options).utcOffset(parseInt(match.groups.offset, 10));

            return time.valueOf();
        }
    }

    return undefined;
}

const CreationDate = 'CreationDate';
const FileSize = 'FileSize';
const LastModified = 'LastModified';

async function statWindowsContainerDirectory(executor: DockerContainerExecutor, itemPath: string): Promise<DirectoryItemStat | undefined> {
    if (/^[a-zA-Z]:\\$/.test(itemPath)) {

        //
        // For root directories, assume they exist and return a faked stat...
        //
        // TODO: Find a WMI command that provides such properties for root directories.
        //

        return {
            ctime: 0,
            mtime: Date.now(),
            size: 0,
            type: 'directory'
        };
    }

    const parsedPath = path.win32.parse(itemPath);

    const drive = parsedPath.root.replace(/\\/, '');
    const wmipath = parsedPath.dir.concat('\\');
    const filename = parsedPath.base;
    const command = [ 'cmd', '/C', `wmic fsdir where "drive='${drive}' and path='${wmipath}' and filename='${filename}'" get ${CreationDate}, ${LastModified} /format:list` ];

    const result = await executor(command);

    const parsedResult = parseWmiList(result);

    if (parsedResult) {
        return {
            ctime: parseWmiTime(parsedResult[CreationDate]),
            mtime: parseWmiTime(parsedResult[LastModified]),
            size: 0,
            type: 'directory'
        };
    }

    return undefined;
}

async function statWindowsContainerFile(executor: DockerContainerExecutor, itemPath: string): Promise<DirectoryItemStat | undefined> {

    const name = itemPath.replace(/\\/, '\\\\');
    const command = [ 'cmd', '/C', `wmic datafile where "name='${name}'" get ${CreationDate}, ${FileSize}, ${LastModified} /format:list` ];

    const result = await executor(command);

    const parsedResult = parseWmiList(result);

    if (parsedResult) {
        return {
            ctime: parseWmiTime(parsedResult[CreationDate]),
            mtime: parseWmiTime(parsedResult[LastModified]),
            size: parseInt(parsedResult[FileSize], 10),
            type: 'file'
        };
    }

    return undefined;
}

export async function statWindowsContainerItem(executor: DockerContainerExecutor, itemPath: string, itemType: DirectoryItemType | undefined): Promise<DirectoryItemStat | undefined> {
    if (itemType === undefined) {
        throw new Error(localize('docker.files.containerFilesUtils.unknownDirectoryItemType', 'Unable to stat Windows directory items without prior knowledge of the item type.'));
    }

    switch (itemType) {
        case 'directory':   return await statWindowsContainerDirectory(executor, itemPath);
        case 'file':        return await statWindowsContainerFile(executor, itemPath);
        default:
            throw new UnrecognizedDirectoryItemTypeError();
    }
}
