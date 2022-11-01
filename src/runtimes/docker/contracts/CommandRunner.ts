/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs } from '../utils/commandLineBuilder';

type CommandResponseBase = {
    command: string;
    args: CommandLineArgs;
};

export type PromiseCommandResponse<T> = CommandResponseBase & {
    parse: (output: string, strict: boolean) => Promise<T>;
};

export type GeneratorCommandResponse<T> = CommandResponseBase & {
    parseStream: (output: NodeJS.ReadableStream, strict: boolean) => AsyncGenerator<T>;
};

export type VoidCommandResponse = CommandResponseBase & {
    parse?: never;
    parseStream?: never;
};

/**
 * A CommandResponse record provides instructions on how to invoke a command
 * and a parse callback that can be used to parse and normalize the standard
 * output from invoking the command. This is the standard type returned by all
 * commands defined by the IContainersClient interface.
 */
export type CommandResponse<T> = PromiseCommandResponse<T> | GeneratorCommandResponse<T> | VoidCommandResponse;


export type Like<T> = T | Promise<T> | (() => T | Promise<T>);

/**
 * A {@link CommandRunner} provides instructions on how to invoke a command
 */
export type CommandRunner =
    (<T>(commandResponseLike: Like<PromiseCommandResponse<T>>) => Promise<T>) &
    ((commandResponseLike: Like<VoidCommandResponse>) => Promise<void>);

/**
 * A {@link StreamingCommandRunner} provides instructions on how to invoke a streaming command
 */
export type StreamingCommandRunner = <T>(commandResponseLike: Like<GeneratorCommandResponse<T>>) => Promise<AsyncGenerator<T>>;

/**
 * A {@link ICommandRunnerFactory} is used to build a CommandRunner instance
 * based for a specific configuration
 */
export interface ICommandRunnerFactory {
    getCommandRunner(): CommandRunner;
    getStreamingCommandRunner(): StreamingCommandRunner;
}

export function normalizeCommandResponseLike<TCommandResponse extends CommandResponseBase>(commandResponseLike: Like<TCommandResponse>): Promise<TCommandResponse> {
    if (typeof commandResponseLike === 'function') {
        return Promise.resolve(commandResponseLike());
    } else {
        return Promise.resolve(commandResponseLike);
    }
}
