import * as path from 'path';
import { DockerExecCommandProvider } from '../DockerApiClient';

export type DirectoryItemType = 'directory' | 'file';

export interface DirectoryItem {
    name: string;
    path: string;
    type: DirectoryItemType;
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

export async function statLinuxContainerItem(executor: DockerContainerExecutor, itemPath: string): Promise<DirectoryItemStat> {
    const command: string[] = [ '/bin/sh', '-c', `stat -c "%W;%Y;%s;%F" "${itemPath}"` ];

    const result = await executor(command);

    const statRegex = /^(?<ctime>\d+);(?<mtime>\d+);(?<size>\d+);(?<type>.+)$/g;

    const statMatch = statRegex.exec(result);

    if (statMatch === null) {
        throw new Error('Unexpected stat output.');
    }

    // NOTE: stat() (i.e. '%W' and "%Y') reports time in seconds since the epoch; VS Code requires milliseconds since the epoch.

    return {
        ctime: parseInt(statMatch.groups.ctime, 10) * 1000,
        mtime: parseInt(statMatch.groups.mtime, 10) * 1000,
        size: parseInt(statMatch.groups.size, 10),
        type: statMatch.groups.type === 'directory' ? 'directory' : 'file'
    };
}
