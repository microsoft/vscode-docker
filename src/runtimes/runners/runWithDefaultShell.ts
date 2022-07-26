/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ClientIdentity, CommandResponseLike, IContainerOrchestratorClient, IContainersClient } from '@microsoft/container-runtimes';
import { ext } from '../../extensionVariables';
import { DefaultEnvShellStreamCommandRunnerFactory } from './DefaultEnvShellStreamingCommandRunner';
import { RuntimeManager } from '../RuntimeManager';

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
    // Get a `DefaultEnvShellStreamCommandRunnerFactory`
    const factory = new DefaultEnvShellStreamCommandRunnerFactory({
        strict: true,
    });

    // Get the active client
    const client: TClient = await runtimeManager.getClient();

    return factory.getCommandRunner()(
        callback(client)
    );
}
