/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module "tar" {
    export interface ParseClass {
        // eslint-disable-next-line @typescript-eslint/prefer-function-type
        new(): NodeJS.ReadWriteStream;
    }

    export const Parse: ParseClass;

    export interface ReadEntry extends NodeJS.EventEmitter {
        path: string;
    }

    export interface CreateOptions {
        cwd?: string;
    }

    export function create(options: CreateOptions, fileList: string[]): NodeJS.ReadableStream;

    export const c: typeof create;
}
