/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContainersClient } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';
import { ContextManager, IContextManager } from './ContextManager';
import { RuntimeManager } from './RuntimeManager';

export class ContainerRuntimeManager extends RuntimeManager<IContainersClient> {
    public readonly contextManager: IContextManager = new ContextManager();
    public readonly onContainerRuntimeClientRegistered = this.runtimeClientRegisteredEmitter.event;

    public constructor() {
        super('containerClient');
    }

    public async getCommand(): Promise<string> {
        const config = vscode.workspace.getConfiguration('docker');
        return config.get<string>('dockerPath', (await this.getClient()).commandName);
    }
}
