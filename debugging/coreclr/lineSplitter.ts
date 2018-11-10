/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export class LineSplitter implements vscode.Disposable {
    private readonly emitter: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    private buffer: string | undefined;

    public get onLine(): vscode.Event<string> {
        return this.emitter.event;
    }

    public close(): void {
        if (this.buffer !== undefined) {
            this.emitter.fire(this.buffer);
            this.buffer = undefined;
        }
    }

    public dispose(): void {
        this.close();
    }

    public write(data: string): void {
        if (data === undefined) {
            return;
        }

        this.buffer = this.buffer !== undefined ? this.buffer + data : data;

        let index = 0;
        let lineStart = 0;

        while (index < this.buffer.length) {
            if (this.buffer[index] === '\n') {
                const line = index === 0 || this.buffer[index - 1] !== '\r'
                    ? this.buffer.substring(lineStart, index)
                    : this.buffer.substring(lineStart, index - 1);

                this.emitter.fire(line);

                lineStart = index + 1;
            }

            index++;
        }

        this.buffer = lineStart < index ? this.buffer.substring(lineStart) : undefined;
    }

    public static splitLines(data: string): string[] {
        const splitter = new LineSplitter();

        const lines: string[] = [];

        splitter.onLine(line => lines.push(line));
        splitter.write(data);
        splitter.close();

        return lines;
    }
}

export default LineSplitter;
