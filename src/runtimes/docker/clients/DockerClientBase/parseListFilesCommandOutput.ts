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

const SupportedFileTypes = [vscode.FileType.Directory, vscode.FileType.File];

type FileMode = {
    mode?: number;
    fileType: vscode.FileType;
};

export function parseListFilesCommandLinuxOutput(
    options: ListFilesCommandOptions,
    output: string
): ListFilesItem[] {
    const regex = /^(?<type>[0-9a-fA-F]+)\s+(?<links>\d+)\s+(?<group>\d+)\s+(?<owner>\d+)\s+(?<size>\d+)\s+(?<atime>\d+)\s+(?<mtime>\d+)\s+(?<ctime>\d+)\s+(?<name>.*)$/gm;

    const items = new Array<ListFilesItem>();
    for (const match of output.matchAll(regex)) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const name = path.basename(match.groups!.name);
        const { mode, fileType } = parseLinuxType(match.groups!.type);
        const size = Number.parseInt(match.groups!.size, 10);
        const mtime = dayjs.unix(Number.parseInt(match.groups!.mtime, 10)).valueOf();
        const ctime = dayjs.unix(Number.parseInt(match.groups!.ctime, 10)).valueOf();
        const atime = dayjs.unix(Number.parseInt(match.groups!.atime, 10)).valueOf();
        /* eslint-enable @typescript-eslint/no-non-null-assertion */

        // Ignore relative directory items...
        if (fileType === vscode.FileType.Directory && (name === '.' || name === '..')) {
            continue;
        }

        // Ignore everything other than directories and plain files
        if (!SupportedFileTypes.includes(fileType)) {
            continue;
        }

        items.push({
            name,
            path: path.posix.join(options.path, name),
            type: fileType,
            mode,
            ctime,
            mtime,
            atime,
            size,
        });
    }

    return items;
}

export function parseListFilesCommandWindowsOutput(
    options: ListFilesCommandOptions,
    output: string
): ListFilesItem[] {
    const regex = /^(?<mtime>(?<date>\d{1,2}(\/|\.)\d{1,2}(\/|\.)\d{4})\s+(?<time>\d{1,2}:\d{1,2}( (AM|PM))?))\s+((?<type><DIR>|<SYMLINKD>)|(?<size>\d+))\s+(?<name>.*)$/gm;

    const items = new Array<ListFilesItem>();
    for (const match of output.matchAll(regex)) {
        /* eslint-disable @typescript-eslint/no-non-null-assertion */
        const name = match.groups!.name;
        const fileType = parseWindowsType(match.groups!.type);
        const size = fileType === vscode.FileType.Directory ? 0 : Number.parseInt(match.groups!.size, 10);
        const mtime = dayjs(match.groups!.mtime, DateFormats).valueOf();
        /* eslint-enable @typescript-eslint/no-non-null-assertion */

        // Ignore relative directory items...
        if (fileType === vscode.FileType.Directory && (name === '.' || name === '..')) {
            continue;
        }

        // Ignore everything other than directories and plain files
        if (!SupportedFileTypes.includes(fileType)) {
            return items;
        }

        items.push({
            name,
            path: path.win32.join(options.path, name),
            type: fileType,
            mtime,
            size,
        });
    }

    return items;
}

function parseLinuxType(fullModeHex: string): FileMode {
    const fullMode = parseInt(fullModeHex, 16);
    const fileType = (fullMode & 0xf000) >> 12;
    const mode = fullMode & 0xfff;
    switch (fileType) {
        case 4:
            return { mode, fileType: vscode.FileType.Directory };
        case 8:
            return { mode, fileType: vscode.FileType.File };
        case 10:
            return { mode, fileType: vscode.FileType.SymbolicLink };
        default:
            return { mode, fileType: vscode.FileType.Unknown };
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
