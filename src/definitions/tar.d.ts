declare module "tar" {
    export interface ParseStream extends NodeJS.ReadWriteStream {
        new(): ParseStream;
    }

    export const Parse: ParseStream;

    export interface ReadEntry extends NodeJS.EventEmitter {
        path: string;
    }

    export interface CreateOptions {
        cwd?: string;
    }

    export function create(options: CreateOptions, fileList: ReadonlyArray<string>): NodeJS.ReadableStream;

    export const c: typeof create;
}
