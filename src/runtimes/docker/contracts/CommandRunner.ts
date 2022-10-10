/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandLineArgs } from '../utils/commandLineBuilder';

/**
 * A CommandResponse record provides instructions on how to invoke a command
 * and a parse callback that can be used to parse and normalize the standard
 * output from invoking the command. This is the standard type returned by all
 * commands defined by the IContainersClient interface.
 *
 * Parse will not be implemented for streaming operations, like container logs
 * or files.
 */
export type CommandResponse<T> = {
    command: string;
    args: CommandLineArgs;
    parse?: (output: string, strict: boolean) => Promise<T>;
};

export type CommandResponseLike<T> = CommandResponse<T> | Promise<CommandResponse<T>> | (() => CommandResponse<T> | Promise<CommandResponse<T>>);

/**
 * A {@link CommandRunner} provides instructions on how to invoke a command
 */
export type CommandRunner = <T>(commandResponse: CommandResponseLike<T>) => Promise<T>;

/**
 * A {@link ICommandRunnerFactory} is used to build a CommandRunner instance
 * based for a specific configuration
 */
export interface ICommandRunnerFactory {
    getCommandRunner(): CommandRunner;
}

export function normalizeCommandResponseLike<T>(commandResponseLike: CommandResponseLike<T>): Promise<CommandResponse<T>> {
    if (typeof commandResponseLike === 'function') {
        return Promise.resolve(commandResponseLike());
    } else {
        return Promise.resolve(commandResponseLike);
    }
}
