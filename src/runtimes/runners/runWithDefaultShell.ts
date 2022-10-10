/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AccumulatorStream, ClientIdentity, CommandResponseLike, IContainerOrchestratorClient, IContainersClient, isChildProcessError, ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '../docker';
import { ext } from '../../extensionVariables';
import { RuntimeManager } from '../RuntimeManager';
import { withDockerEnvSettings } from '../../utils/withDockerEnvSettings';

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

// 'strict', 'stdErrPipe', and 'env' are set by this function and thus should not be included as arguments to the additional options
type DefaultEnvShellStreamCommandRunnerOptions = Omit<ShellStreamCommandRunnerOptions, 'strict' | 'stdErrPipe' | 'env'>;

export async function runWithDefaultShell<TClient extends ClientIdentity, T>(
    callback: ClientCallback<TClient, T>,
    runtimeManager: RuntimeManager<TClient>,
    additionalOptions?: DefaultEnvShellStreamCommandRunnerOptions
): Promise<T> {
    const errAccumulator = new AccumulatorStream();

    // Get a `DefaultEnvShellStreamCommandRunnerFactory`
    const factory = new DefaultEnvShellStreamCommandRunnerFactory({
        ...additionalOptions,
        strict: true,
        stdErrPipe: errAccumulator,
    });

    // Get the active client
    const client: TClient = await runtimeManager.getClient();

    try {
        return await factory.getCommandRunner()(
            callback(client)
        );
    } catch (err) {
        if (isChildProcessError(err)) {
            // If this is a child process error, alter the message to be the stderr output, if it isn't falsy
            const stdErr = await errAccumulator.getString();
            err.message = stdErr || err.message;
        }

        throw err;
    } finally {
        errAccumulator.destroy();
    }
}

class DefaultEnvShellStreamCommandRunnerFactory<TOptions extends DefaultEnvShellStreamCommandRunnerOptions> extends ShellStreamCommandRunnerFactory<ShellStreamCommandRunnerOptions> {
    public constructor(options: TOptions) {
        super({
            ...options,
            env: withDockerEnvSettings(process.env),
        });
    }
}
