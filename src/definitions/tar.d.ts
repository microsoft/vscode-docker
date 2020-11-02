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
