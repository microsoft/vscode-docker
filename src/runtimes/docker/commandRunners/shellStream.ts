/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as stream from 'stream';
import {
    CommandResponseBase,
    CommandRunner,
    GeneratorCommandResponse,
    ICommandRunnerFactory,
    Like,
    normalizeCommandResponseLike,
    PromiseCommandResponse,
    StreamingCommandRunner,
    VoidCommandResponse,
} from '../contracts/CommandRunner';
import { CancellationTokenLike } from '../typings/CancellationTokenLike';
import { AccumulatorStream } from '../utils/AccumulatorStream';
import { CancellationError } from '../utils/CancellationError';
import { CommandLineArgs } from '../utils/commandLineBuilder';
import {
    spawnStreamAsync,
    StreamSpawnOptions,
} from '../utils/spawnStreamAsync';

export type ShellStreamCommandRunnerOptions = StreamSpawnOptions & {
    strict?: boolean;
};

/**
 * A {@link CommandRunnerFactory} that executes commands on a given shell and
 * manages access to the necessary stdio streams
 */
export class ShellStreamCommandRunnerFactory<TOptions extends ShellStreamCommandRunnerOptions> implements ICommandRunnerFactory {
    public constructor(protected readonly options: TOptions) { }

    public getCommandRunner(): CommandRunner {
        return async <T>(commandResponseLike: Like<VoidCommandResponse> | Like<PromiseCommandResponse<T>>) => {
            const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
            const { command, args } = this.getCommandAndArgs(commandResponse);

            throwIfCancellationRequested(this.options.cancellationToken);

            let result: T | undefined;

            let accumulator: AccumulatorStream | undefined;

            try {
                if (commandResponse.parse) {
                    accumulator = new AccumulatorStream();
                }

                // Determine the appropriate combination of streams that need to read from stdout
                let stdOutPipe: NodeJS.WritableStream | undefined = accumulator;
                if (accumulator && this.options.stdOutPipe) {
                    const stdOutPassThrough = new stream.PassThrough();
                    stdOutPassThrough.pipe(this.options.stdOutPipe);
                    stdOutPassThrough.pipe(accumulator);

                    stdOutPipe = stdOutPassThrough;
                } else if (this.options.stdOutPipe) {
                    stdOutPipe = this.options.stdOutPipe;
                }

                await spawnStreamAsync(command, args, { ...this.options, stdOutPipe: stdOutPipe });

                throwIfCancellationRequested(this.options.cancellationToken);

                if (accumulator && commandResponse.parse) {
                    const output = await accumulator.getString();
                    throwIfCancellationRequested(this.options.cancellationToken);
                    result = await commandResponse.parse(output, !!this.options.strict);
                }

                throwIfCancellationRequested(this.options.cancellationToken);

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return result!;
            } finally {
                accumulator?.destroy();
            }
        };
    }

    public getStreamingCommandRunner(): StreamingCommandRunner {
        return this.streamingCommandRunner.bind(this);
    }

    private async *streamingCommandRunner<T>(commandResponseLike: Like<GeneratorCommandResponse<T>>): AsyncGenerator<T> {
        const commandResponse = await normalizeCommandResponseLike(commandResponseLike);
        const { command, args } = this.getCommandAndArgs(commandResponse);

        throwIfCancellationRequested(this.options.cancellationToken);

        const dataStream: stream.PassThrough = new stream.PassThrough();
        const innerGenerator = commandResponse.parseStream(dataStream, !!this.options.strict);

        // The process promise will be awaited only after the innerGenerator finishes
        const processPromise = spawnStreamAsync(command, args, { ...this.options, stdOutPipe: dataStream });

        for await (const element of innerGenerator) {
            yield element;
        }

        await processPromise;
    }

    protected getCommandAndArgs(commandResponse: CommandResponseBase): { command: string, args: CommandLineArgs } {
        return commandResponse;
    }
}

function throwIfCancellationRequested(token?: CancellationTokenLike): void {
    if (token?.isCancellationRequested) {
        throw new CancellationError('Command cancelled', token);
    }
}
