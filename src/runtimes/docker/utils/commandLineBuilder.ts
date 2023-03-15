/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString, ShellQuoting } from 'vscode';
import { toArray } from './toArray';

export type CommandLineArgs = Array<ShellQuotedString | string>;

export type CommandLineCurryFn = (cmdLineArgs?: CommandLineArgs) => CommandLineArgs;

/**
 * Chain multiple command line argument generator functions
 * @param cmdLineArgFns Command line argument methods to compose into chained calls
 * @returns A function that takes an optional starting CommandLineArgs record
 */
export function composeArgs(...cmdLineArgFns: Array<CommandLineCurryFn>): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        return cmdLineArgFns.reduce<CommandLineArgs>(
            (commandLineArgs: CommandLineArgs, cmdLineArgsFn) => cmdLineArgsFn(commandLineArgs),
            cmdLineArgs || [],
        ) as unknown as CommandLineArgs; // A bug in the Inlay Hints feature is fixed by this redundant `as unknown as CommandLineArgs` casting
    };
}

/**
 * Functional method for adding additional raw arguments to an existing list of
 * arguments.
 * @param args Raw arguments to add to the CommandLineArguments records
 * @returns A function that takes an optional array of CommandLineArguments and appends the provided arguments
 */
export function withArg(...args: Array<string | ShellQuotedString | null | undefined>): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        return args.map(escaped).reduce<CommandLineArgs>((allArgs, arg) => {
            if (arg) {
                return [...allArgs, arg];
            }

            return allArgs;
        }, cmdLineArgs);
    };
}

/**
 * Functional method for adding additional quoted arguments to an existing
 * list of arguments.
 * @param args Raw arguments to add to the CommandLineArguments records
 * @returns A function that takes an optional array of CommandLineArguments and appends the provided arguments
 */
export function withQuotedArg(...args: Array<string | ShellQuotedString | null | undefined>): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        return args.map(quoted).reduce<CommandLineArgs>((allArgs, arg) => {
            if (arg) {
                return [...allArgs, arg];
            }

            return allArgs;
        }, cmdLineArgs);
    };
}

/**
 * Functional method for adding a flag argument (--name=value) to an existing list
 * of arguments.
 * @param name The name of the flag argument
 * @param value The value to set for the flag argument
 * @returns A function that takes an optional array of CommandLineArguments and appends the specified flag argument
 */
export function withFlagArg(name: string, value: boolean | undefined): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        if (value) {
            return withArg(name)(cmdLineArgs);
        }

        return cmdLineArgs;
    };
}

type WithNamedArgOptions = {
    assignValue?: boolean;
    shouldQuote?: boolean;
};
/**
 * Functional method for assigning an array style argument (multiple instances
 * of the argument are treated as an appended list)
 * @param name The name of the argument
 * @param args The values to set for the argument
 * @returns A function that takes an optional array of CommandLineArguments and appends an array style argument
 */
export function withNamedArg(
    name: string,
    args: Array<ShellQuotedString | string | null | undefined> | ShellQuotedString | string | null | undefined,
    { assignValue = false, shouldQuote = true }: WithNamedArgOptions = {},
): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        return toArray(args)
            .reduce((allArgs, arg) => {
                if (arg) {
                    const normalizedArg = shouldQuote ? quoted(arg) : escaped(arg);
                    if (assignValue) {
                        return withArg(`${name}=${normalizedArg?.value}`)(allArgs);
                    }

                    return withArg(name, normalizedArg)(allArgs);
                }

                return allArgs;
            }, cmdLineArgs);
    };
}

/**
 * Functional method for adding additional verbatim arguments to an existing list of
 * arguments. They will not be quoted nor escaped.
 * @param args Raw arguments to add to the CommandLineArguments records
 * @returns A function that takes an optional array of CommandLineArguments and appends the provided arguments
 * @deprecated {@link withArg} should be used instead in almost all cases
 */
export function withVerbatimArg(...args: Array<string | null | undefined>): CommandLineCurryFn {
    return (cmdLineArgs: CommandLineArgs = []) => {
        return args.reduce<CommandLineArgs>((allArgs, arg) => {
            if (arg) {
                return [...allArgs, arg];
            }

            return allArgs;
        }, cmdLineArgs);
    };
}

/**
 * Convert a value to a ShellQuotedString record
 * @param value The value to potentially wrap as a ShellQuotedString
 * @returns A new ShellQuotedString for the given value or undefined if value is empty
 */
export function quoted(value: string | ShellQuotedString | null | undefined): ShellQuotedString | undefined {
    if (value) {
        if (typeof value === 'string') {
            return {
                value: value,
                quoting: ShellQuoting.Strong,
            };
        } else {
            return value;
        }
    }

    return undefined;
}

/**
 * Convert a value to an escaped ShellQuotedString record
 * @param value The value to potentially wrap as an escaped ShellQuotedString
 * @returns a new ShellQuotedString with quoting set to Escape or undefined if the value is empty
 */
export function escaped(value: ShellQuotedString | string | null | undefined): ShellQuotedString | undefined {
    if (value) {
        if (typeof value === 'string') {
            return {
                value,
                quoting: ShellQuoting.Escape,
            };
        } else {
            return value;
        }
    }

    return undefined;
}

/**
 * Convert a value to a weak ShellQuotedString record
 * @param value The value to potentially wrap a a weak ShellQuotedString
 * @returns A new ShellQuotedString with quoting set to Weak or undefined if the value is empty
 */
export function innerQuoted(value: ShellQuotedString | string | null | undefined): ShellQuotedString | undefined {
    if (value) {
        if (typeof value === 'string') {
            return {
                value,
                quoting: ShellQuoting.Weak,
            };
        } else {
            return {
                ...value,
                quoting: value.quoting === ShellQuoting.Escape ? ShellQuoting.Weak : value.quoting,
            };
        }
    }

    return undefined;
}
