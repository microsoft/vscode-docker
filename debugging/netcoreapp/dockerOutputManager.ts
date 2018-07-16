/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';

export interface DockerOutputManager {
    append(content: string): void;
    appendLine(content: string): void;
    performOperation<T>(operation: () => Promise<T>, startContent: string, endContent?: string, errorContent?: string): Promise<T>;
}

export class DefaultDockerOutputManager implements DockerOutputManager {
    constructor(private readonly outputChannel: vscode.OutputChannel) {
    }

    append(content: string): void {
        this.outputChannel.append(content);
    }

    appendLine(content: string): void {
        this.outputChannel.appendLine(content);
    }

    async performOperation<T>(operation: () => Promise<T>, startContent: string, endContent?: string, errorContent?: string): Promise<T> {
        this.outputChannel.show(true);
        this.outputChannel.appendLine(startContent);

        try {
            const result = await operation();

            if (endContent) {
                this.outputChannel.appendLine(endContent);
            }

            return result;
        } catch (error) {
            if (errorContent) {
                this.outputChannel.appendLine(errorContent);
            }

            throw error;
        }
    }
}
