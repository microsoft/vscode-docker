/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ClientIdentity, CommandResponseLike, IContainerOrchestratorClient, IContainersClient, ShellStreamCommandRunnerFactory } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { RuntimeManager } from '../runtimes/RuntimeManager';

type ClientCallback<TClient, T> = (client: TClient) => CommandResponseLike<T>;

export async function runWithDefaultShellInternal<T>(callback: ClientCallback<IContainersClient, T>): Promise<T> {
    return await runWithDefaultShell(
        callback,
        ext.runtimeManager
    );
}

export async function runOrchestratorWithDefaultShellInternal<T>(callback: ClientCallback<IContainerOrchestratorClient, T>): Promise<T> {
    return await runWithDefaultShell(
        callback,
        ext.orchestratorManager
    );
}

async function runWithDefaultShell<TClient extends ClientIdentity, T>(
    callback: ClientCallback<TClient, T>,
    runtimeManager: RuntimeManager<TClient>
): Promise<T> {
    // Get environment settings
    const config = vscode.workspace.getConfiguration('docker');
    const environmentSettings = config.get<NodeJS.ProcessEnv>('environment', {});

    // Get a `ShellStreamCommandRunnerFactory`
    const factory = new ShellStreamCommandRunnerFactory({
        strict: true,
        env: {
            ...process.env,
            ...environmentSettings,
        },
    });

    // Get the active client
    const client: TClient = await runtimeManager.getClient();

    return factory.getCommandRunner()(
        callback(client)
    );
}
