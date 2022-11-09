/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs } from '../utils/commandLineBuilder';

/**
 * A command response includes the command (i.e., the executable) to execute, and arguments to pass
 */
export type CommandResponseBase = {
    command: string;
    args: CommandLineArgs;
};

/**
 * A {@link CommandResponseBase} that also includes a method to parse the output of the command
 */
export type PromiseCommandResponse<T> = CommandResponseBase & {
    parse: (output: string, strict: boolean) => Promise<T>;
};

/**
 * A {@link CommandResponseBase} that also includes a method to parse streaming output of the command
 * as an {@link AsyncGenerator}
 */
export type GeneratorCommandResponse<T> = CommandResponseBase & {
    parseStream: (output: NodeJS.ReadableStream, strict: boolean) => AsyncGenerator<T>;
};

/**
 * A {@link CommandResponseBase} that cannot include parsing methods--i.e. the output is `void`
 */
export type VoidCommandResponse = CommandResponseBase & {
    parse?: never;
    parseStream?: never;
};

/**
 * A helper type that allows for several simple ways to resolve an item
 */
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
export type StreamingCommandRunner = <T>(commandResponseLike: Like<GeneratorCommandResponse<T>>) => AsyncGenerator<T>;

/**
 * A {@link ICommandRunnerFactory} is used to build a CommandRunner instance
 * based for a specific configuration
 */
export interface ICommandRunnerFactory {
    getCommandRunner(): CommandRunner;
    getStreamingCommandRunner(): StreamingCommandRunner;
}

/**
 * Converts a `Like<CommandResponse>` into a `CommandResponse`
 * @param commandResponseLike The command response-like to normalize
 * @returns The command response
 */
export function normalizeCommandResponseLike<TCommandResponse extends CommandResponseBase>(commandResponseLike: Like<TCommandResponse>): Promise<TCommandResponse> {
    if (typeof commandResponseLike === 'function') {
        return Promise.resolve(commandResponseLike());
    } else {
        return Promise.resolve(commandResponseLike);
    }
}
