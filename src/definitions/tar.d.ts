/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * The `@types/tar` package is riddled with inaccuracies, so it's easier
 * to just declare typings for it here
 */
declare module "tar" {
    //#region Parse

    export interface ParseOptions {
        filter?: (path: string, entry: ReadEntryClass) => boolean;
        onentry?: (entry: ReadEntryClass) => void;
    }

    export interface ParseClass extends NodeJS.ReadWriteStream {
        // eslint-disable-next-line @typescript-eslint/no-misused-new
        new(options?: ParseOptions): ParseClass;
    }

    export const Parse: ParseClass;

    //#endregion Parse

    //#region Pack

    export interface PackOptions {
        portable?: boolean;
    }

    export interface PackClass extends NodeJS.ReadWriteStream {
        // eslint-disable-next-line @typescript-eslint/no-misused-new
        new(options?: PackOptions): PackClass;
        add(readEntry: ReadEntryClass): void;
    }

    export const Pack: PackClass;

    //#endregion Pack

    //#region ReadEntry

    export interface ReadEntryOptions {
        path: string;
        type: 'File' | 'Directory';
        size: number;
        atime: Date;
        mtime: Date;
        ctime: Date;
        mode?: number;
        gid?: number;
        uid?: number;
    }

    export interface ReadEntryClass extends NodeJS.EventEmitter, NodeJS.ReadWriteStream {
        // eslint-disable-next-line @typescript-eslint/no-misused-new
        new(options: ReadEntryOptions): ReadEntryClass;
        path: string;
    }

    export const ReadEntry: ReadEntryClass;

    //#endregion ReadEntry

    //#region Create

    export interface CreateOptions {
        cwd?: string;
    }

    export function create(options: CreateOptions, fileList: string[]): NodeJS.ReadableStream;

    export const c: typeof create;

    //#endregion
}
