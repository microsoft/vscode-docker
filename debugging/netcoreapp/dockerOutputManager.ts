/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

type outputCallback<T> = (result: T) => string;

export interface DockerOutputManager {
    append(content: string): void;
    appendLine(content: string): void;
    performOperation<T>(startContent: string, operation: () => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T>;
}

export class DefaultDockerOutputManager implements DockerOutputManager {
    private isShown = false;

    constructor(private readonly outputChannel: vscode.OutputChannel) {
    }

    append(content: string): void {
        this.outputChannel.append(content);
    }

    appendLine(content: string): void {
        this.outputChannel.appendLine(content);
    }

    async performOperation<T>(startContent: string, operation: () => Promise<T>, endContent?: string | outputCallback<T>, errorContent?: string | outputCallback<Error>): Promise<T> {
        if (!this.isShown) {
            this.outputChannel.show(true);
            this.isShown = true;
        }

        this.outputChannel.appendLine(startContent);

        try {
            const result = await operation();

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
}
