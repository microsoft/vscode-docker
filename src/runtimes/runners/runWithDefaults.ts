/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import * as vscode from 'vscode';
import { AccumulatorStream, ClientIdentity, GeneratorCommandResponse, IContainersClient, isChildProcessError, Like, normalizeCommandResponseLike, NoShell, PromiseCommandResponse, ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions, VoidCommandResponse } from '../docker';
import { ext } from '../../extensionVariables';
import { RuntimeManager } from '../RuntimeManager';
import { withDockerEnvSettings } from '../../utils/withDockerEnvSettings';

type ClientCallback<TClient, T> = (client: TClient) => Like<PromiseCommandResponse<T>>;
type VoidClientCallback<TClient> = (client: TClient) => Like<VoidCommandResponse>;
type StreamingClientCallback<TClient, T> = (client: TClient) => Like<GeneratorCommandResponse<T>>;

// 'env', 'shell', 'shellProvider', 'stdErrPipe', and 'strict' are set by this function and thus should not be included as arguments to the additional options
type DefaultEnvStreamCommandRunnerOptions = Omit<ShellStreamCommandRunnerOptions, 'env' | 'shell' | 'shellProvider' | 'stdErrPipe' | 'strict'>;

export async function runWithDefaults<T>(callback: ClientCallback<IContainersClient, T>, additionalOptions?: DefaultEnvStreamCommandRunnerOptions): Promise<T>;
export async function runWithDefaults(callback: VoidClientCallback<IContainersClient>, additionalOptions?: DefaultEnvStreamCommandRunnerOptions): Promise<void>;
export async function runWithDefaults<T>(callback: ClientCallback<IContainersClient, T> | VoidClientCallback<IContainersClient>, additionalOptions?: DefaultEnvStreamCommandRunnerOptions): Promise<T | void> {
    return await runWithDefaultsInternal(
        callback,
        ext.runtimeManager,
        additionalOptions
    );
}

export function streamWithDefaults<T>(callback: StreamingClientCallback<IContainersClient, T>, additionalOptions?: DefaultEnvStreamCommandRunnerOptions): AsyncGenerator<T> {
    return streamWithDefaultsInternal(
        callback,
        ext.runtimeManager,
        additionalOptions
    );
}

async function runWithDefaultsInternal<TClient extends ClientIdentity, T>(
    callback: ClientCallback<TClient, T> | VoidClientCallback<TClient>,
    runtimeManager: RuntimeManager<TClient>,
    additionalOptions?: DefaultEnvStreamCommandRunnerOptions
): Promise<T | void> {
    // Get a `DefaultEnvStreamCommandRunnerFactory`
    const factory = new DefaultEnvStreamCommandRunnerFactory(additionalOptions);

    // Get the active client
    const client: TClient = await runtimeManager.getClient();

    try {
        // Flatten the callback
        const response = await normalizeCommandResponseLike(callback(client));

        if (response.parse) {
            return await factory.getCommandRunner()(response as PromiseCommandResponse<T>);
        } else {
            await factory.getCommandRunner()(response as VoidCommandResponse);
        }
    } catch (err) {
        if (isChildProcessError(err)) {
            // If this is a child process error, alter the message to be the stderr output, if it isn't falsy
            const stdErr = await factory.errAccumulator.getString();
            err.message = stdErr || err.message;
        }

        throw err;
    } finally {
        factory.dispose();
    }
}

async function* streamWithDefaultsInternal<TClient extends ClientIdentity, T>(
    callback: StreamingClientCallback<TClient, T>,
    runtimeManager: RuntimeManager<TClient>,
    additionalOptions?: DefaultEnvStreamCommandRunnerOptions
): AsyncGenerator<T> {
    // Get a `DefaultEnvStreamCommandRunnerFactory`
    const factory = new DefaultEnvStreamCommandRunnerFactory(additionalOptions);

    // Get the active client
    const client: TClient = await runtimeManager.getClient();

    try {
        const runner = factory.getStreamingCommandRunner();
        const generator = runner(callback(client));

        for await (const element of generator) {
            yield element;
        }
    } catch (err) {
        if (isChildProcessError(err)) {
            // If this is a child process error, alter the message to be the stderr output, if it isn't falsy
            const stdErr = await factory.errAccumulator.getString();
            err.message = stdErr || err.message;
        }

        throw err;
    } finally {
        factory.dispose();
    }
}

class DefaultEnvStreamCommandRunnerFactory<TOptions extends DefaultEnvStreamCommandRunnerOptions> extends ShellStreamCommandRunnerFactory<ShellStreamCommandRunnerOptions> implements vscode.Disposable {
    public readonly errAccumulator: AccumulatorStream;

    public constructor(options: TOptions) {
        const errAccumulator = new AccumulatorStream();

        let stdOutPipe: NodeJS.WritableStream | undefined;
        if (ext.outputChannel.isDebugLoggingEnabled) {
            stdOutPipe = new stream.PassThrough();
            stdOutPipe.on('data', (chunk: Buffer) => {
                try {
                    ext.outputChannel.debug(chunk.toString());
                } catch {
                    // Do not throw on diagnostic errors
                }
            });
        }

        const stdErrPipe = new stream.PassThrough();
        stdErrPipe.on('data', (chunk: Buffer) => {
            try {
                ext.outputChannel.error(chunk.toString());
            } catch {
                // Do not throw on diagnostic errors
            }
        });
        stdErrPipe.pipe(errAccumulator);

        const onCommand = (command) => {
            ext.outputChannel.debug(command);
            if (typeof options?.onCommand === 'function') {
                options.onCommand(command);
            }
        };

        super({
            ...options,
            env: withDockerEnvSettings(process.env),
            shell: false,
            shellProvider: new NoShell(),
            onCommand,
            stdOutPipe,
            stdErrPipe,
            windowsVerbatimArguments: true,
            strict: true,
        });

        this.errAccumulator = errAccumulator;
    }

    public dispose(): void {
        this.errAccumulator.destroy();
    }
}
