/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { LineSplitter } from './lineSplitter';

type outputCallback<T> = (result: T) => string;

export interface OutputManager {
    append(content: string): void;
    appendLine(content: string): void;
    performOperation<T>(startContent: string, operation: (outputManager: OutputManager) => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T>;
}

export class DefaultOutputManager implements OutputManager, vscode.Disposable {
    private readonly lineSplitter: LineSplitter = new LineSplitter();
    private isShown: boolean = false;

    public constructor(private readonly outputChannel: vscode.OutputChannel, private readonly level: number = 0) {
        this.lineSplitter.onLine(line => this.outputChannel.appendLine(this.generatePrefix(line)));
    }

    public append(content: string): void {
        if (this.level) {
            this.lineSplitter.write(content);
        } else {
            this.outputChannel.append(content);
        }
    }

    public appendLine(content: string): void {
        if (this.level) {
            this.lineSplitter.write(content + '\n');
        } else {
            this.outputChannel.appendLine(content);
        }
    }

    public dispose(): void {
        this.lineSplitter.close();
    }

    public async performOperation<T>(startContent: string, operation: (outputManager: OutputManager) => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T> {
        if (!this.isShown) {
            this.outputChannel.show(true);
            this.isShown = true;
        }

        this.appendLine(startContent);

        try {
            const nextLevelOutputManager = new DefaultOutputManager(this.outputChannel, this.level + 1);

            let result: T;

            try {

                result = await operation(nextLevelOutputManager);
            }
            finally {
                nextLevelOutputManager.dispose();
            }

            if (endContent) {
                this.appendLine(typeof endContent === 'string' ? endContent : endContent(result));
            }

            return result;
        } catch (error) {
            if (errorContent) {
                this.appendLine(typeof errorContent === 'string' ? errorContent : errorContent(<Error>error));
            }

            throw error;
        }
    }

    private generatePrefix(content?: string): string {
        return '>'.repeat(this.level) + ' ' + (content || '');
    }
}
