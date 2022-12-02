/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { ListFilesCommandOptions, ListFilesItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';

const DateFormats = [
    'MMM D HH:mm', // Linux format
    'MMM D YYYY', // Linux format for last year
    'MM/DD/YYYY hh:mm A', // Windows format
];

export function parseListFilesCommandLinuxOutput(
    options: ListFilesCommandOptions,
    output: string
): ListFilesItem[] {
    return parseListFilesOutput(
        output,
        /^(?<type>[bcdDlps-])(?<perm>[r-][w-][sStTx-]){3}\s+(?<links>\d+)\s+(?<owner>[a-z0-9_.][a-z0-9_.-]*\$?)\s+(?<group>[a-z0-9_.][a-z0-9_.-]*\$?)\s+(?<size>\d+(, \d+)?)\s+(?<mtime>(?<date>\w+\s+\d+)\s+(?<yearOrTime>\d{4}|\d{1,2}:\d{2}))\s+(?<name>.*)$/gm,
        parseLinuxType,
        (name) => path.posix.join(options.path, name)
    );
}

export function parseListFilesCommandWindowsOutput(
    options: ListFilesCommandOptions,
    output: string
): ListFilesItem[] {
    return parseListFilesOutput(
        output,
        /^(?<mtime>(?<date>\d{1,2}(\/|\.)\d{1,2}(\/|\.)\d{4})\s+(?<time>\d{1,2}:\d{1,2}( (AM|PM))?))\s+((?<type><DIR>|<SYMLINKD>)|(?<size>\d+))\s+(?<name>.*)$/gm,
        parseWindowsType,
        (name) => path.win32.join(options.path, name)
    );
}

function parseListFilesOutput(
    output: string,
    expression: RegExp,
    parseType: (type: string) => vscode.FileType,
    pathJoin: (name: string) => string
): ListFilesItem[] {
    let match = expression.exec(output);

    const items: ListFilesItem[] = [];

    while (match !== null) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const name = match.groups!.name;
        const type = parseType(match.groups!.type);
        const size = type === vscode.FileType.Directory ? 0 : Number.parseInt(match.groups!.size, 10);
        const mtime = dayjs(match.groups!.mtime, DateFormats);
        /* eslint-enable @typescript-eslint/no-non-null-assertion */

        match = expression.exec(output);

        //
        // NOTE: Do not use `match` below this point.
        //

        // Ignore relative directory items...
        if (type === vscode.FileType.Directory && (name === '.' || name === '..')) {
            continue;
        }

        // Ignore everything other than directories and plain files
        if (type !== vscode.FileType.Directory && type !== vscode.FileType.File) {
            continue;
        }

        items.push(
            {
                name,
                path: pathJoin(name),
                type,
                ctime: 0,
                mtime: mtime.valueOf(),
                size,
            }
        );
    }

    return items;
}

function parseLinuxType(type: string): vscode.FileType {
    switch (type) {
        case 'd':
            return vscode.FileType.Directory;
        case '-':
            return vscode.FileType.File;
        case 'l':
            return vscode.FileType.SymbolicLink;
        default:
            return vscode.FileType.Unknown;
    }
}

function parseWindowsType(type: string | undefined): vscode.FileType {
    switch (type?.toUpperCase()) {
        case '<DIR>':
            return vscode.FileType.Directory;
        case '':
        case undefined:
            // Blank or undefined type is a file
            return vscode.FileType.File;
        case '<SYMLINKD>':
        case '<SYMLINK>':
            return vscode.FileType.SymbolicLink;
        default:
            return vscode.FileType.Unknown;
    }
}
