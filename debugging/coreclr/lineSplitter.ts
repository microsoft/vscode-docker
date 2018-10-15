/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export class LineSplitter {
    private readonly emitter = new vscode.EventEmitter<string>();
    private buffer: string;

    public get onLine(): vscode.Event<string> {
        return this.emitter.event;
    }

    public close(): void {
        if (this.buffer) {
            this.emitter.fire(this.buffer);
            this.buffer = undefined;
        }
    }

    public write(data: string): void {
        let index = 0;
        let lineStart = 0;
        while (index < data.length) {
            if (data[index] === '\n') {
                const dataSegment = data.substring(lineStart, index);
                const line = this.buffer ? this.buffer + dataSegment : dataSegment;

                this.emitter.fire(line);

                this.buffer = undefined;
                lineStart = index + 1;
            }

            index++;
        }

        if (lineStart < index) {
            this.buffer = data.substring(lineStart);
        }
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

