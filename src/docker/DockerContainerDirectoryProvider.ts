import * as path from 'path';

export type DirectoryItemType = 'directory' | 'file';

export interface DirectoryItem {
    name: string;
    path: string;
    type: DirectoryItemType;
}

export type DockerContainerExecutor = (containerId: string, commands: string[], user?: string) => Promise<string>;

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

export async function getLinuxContainerDirectoryItems(executor: DockerContainerExecutor, containerId: string, parentPath: string | undefined): Promise<DirectoryItem[]> {
    if (parentPath === undefined) {
        parentPath = '/';
    }

    const commands = ['/bin/sh', '-c', `ls -la "${parentPath}"` ];

    const output = await executor(containerId, commands);

    return parseLinuxDirectoryItems(output, parentPath);
}

export async function getWindowsContainerDirectoryItems(executor: DockerContainerExecutor, containerId: string, parentPath: string | undefined): Promise<DirectoryItem[]> {
    const commands = ['cmd', '/C', `dir /A-S /-C "${parentPath}"` ];

    let output: string;

    try {
        // Try the listing with the default user...
        output = await executor(containerId, commands);
    } catch {
        try {
            // If that fails, try another well-known user...
            output = await executor(containerId, commands, 'ContainerAdministrator');
        } catch {
            // If *that* fails, try a last well-known user...
            output = await executor(containerId, commands, 'Administrator');
        }
    }

    return parseWindowsDirectoryItems(output, parentPath);
}
