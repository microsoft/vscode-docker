/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IContainerOrchestratorClient } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { RuntimeManager } from './RuntimeManager';

export class OrchestratorRuntimeManager extends RuntimeManager<IContainerOrchestratorClient> {
    public readonly onOrchestratorRuntimeClientRegistered = this.runtimeClientRegisteredEmitter.event;

    public getCommand(): string {
        const config = vscode.workspace.getConfiguration('docker');
        return config.get<string>('composeCommand', ext.orchestratorClient.commandName);
    }
}
