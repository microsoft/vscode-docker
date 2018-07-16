/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export interface DockerOutputManager {
    append(content: string): void;
    appendLine(content: string): void;
    performOperation<T>(startContent: string, operation: () => Promise<T>, endContent?: string, errorContent?: string): Promise<T>;
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

    async performOperation<T>(startContent: string, operation: () => Promise<T>, endContent?: string, errorContent?: string): Promise<T> {
        if (!this.isShown) {
            this.outputChannel.show(true);
            this.isShown = true;
        }

        this.outputChannel.appendLine(startContent);

        try {
            const result = await operation();

            if (endContent) {
                this.appendLine(endContent);
            }

            return result;
        } catch (error) {
            if (errorContent) {
                this.appendLine(errorContent);
            }

            throw error;
        }
    }
}
