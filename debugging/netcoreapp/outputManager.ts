/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

type outputCallback<T> = (result: T) => string;

export interface OutputManager {
    append(content: string): void;
    appendLine(content: string): void;
    performOperation<T>(startContent: string, operation: (outputManager: OutputManager) => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T>;
}

export class DefaultOutputManager implements OutputManager {
    private skipFirstLine = false;
    private isShown = false;

    constructor(private readonly outputChannel: vscode.OutputChannel, private readonly level: number = 0) {
    }

    append(content: string): void {
        if (this.level) {
            const split = content.split(/[\n\r]/g);
            const generateContent =
                c => {
                    return this.skipFirstLine ? c : this.generatePrefix(c);
                };

            for (let i = 0; i < split.length; i++) {
                if (i < split.length - 1) {
                    this.outputChannel.appendLine(generateContent(split[i]));
                    this.skipFirstLine = false;
                } else if (split[i].length > 0) {
                    this.outputChannel.append(generateContent(split[i]));
                    this.skipFirstLine = true;
                } else {
                    this.skipFirstLine = false;
                }
            }
        } else {
            this.outputChannel.append(content);
        }
    }

    appendLine(content: string): void {
        if (this.level) {
            this.outputChannel.append(this.generatePrefix());
        }

        this.outputChannel.appendLine(content);
    }

    async performOperation<T>(startContent: string, operation: (outputManager: OutputManager) => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T> {
        if (!this.isShown) {
            this.outputChannel.show(true);
            this.isShown = true;
        }

        this.appendLine(startContent);

        try {
            const result = await operation(new DefaultOutputManager(this.outputChannel, this.level + 1));

            if (endContent) {
                this.appendLine(typeof endContent === 'string' ? endContent : endContent(result));
            }

            return result;
        } catch (error) {
            if (errorContent) {
                this.appendLine(typeof errorContent === 'string' ? errorContent : errorContent(error));
            }

            throw error;
        }
    }

    private generatePrefix(content?: string): string {
        return '>'.repeat(this.level) + ' ' + (content || '');
    }
}
