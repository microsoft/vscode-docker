import { ShellQuotedString, ShellQuoting } from "vscode";

/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export class CommandLineBuilder {
    private readonly args: ShellQuotedString[] = [];

    public static create(...args: (string | ShellQuotedString | undefined)[]): CommandLineBuilder {
        const builder = new CommandLineBuilder();

        if (args !== undefined) {
            for (const arg of args) {
                builder.withArg(arg);
            }
        }

        return builder;
    }

    public withArg(arg: string | ShellQuotedString | undefined): CommandLineBuilder {
        if (typeof (arg) === 'string') {
            if (arg) { // Quoted strings can be added as empty, but withArg will not allow an empty string arg
                this.args.push(
                    {
                        value: arg,
                        quoting: ShellQuoting.Escape
                    }
                );
            }
        } else if (arg !== undefined) {
            this.args.push(arg);
        }

        return this;
    }

    public withArgs(args: string | undefined): CommandLineBuilder {
        if (args) {
            for (const arg of args.split(' ')) {
                this.withArg(arg);
            }
        }

        return this;
    }

    public withFlagArg(name: string, value: boolean | undefined): CommandLineBuilder {
        if (value) {
            this.withArg(name);
        }

        return this;
    }

    public withNamedArg(name: string, value: string | ShellQuotedString | undefined): CommandLineBuilder {
        if (typeof (value) === 'string') {
            this.withArg(name);
            this.withArg(
                {
                    value: value,
                    quoting: ShellQuoting.Strong // The prior behavior was to quote
                }
            );
        } else if (value !== undefined) {
            this.withArg(name);
            this.withArg(value);
        }

        return this;
    }

    public withQuotedArg(value: string): CommandLineBuilder {
        if (value !== undefined) {
            this.withArg(
                {
                    value: value,
                    quoting: ShellQuoting.Strong
                }
            );
        }

        return this;
    }

    public withKeyValueArgs(name: string, values: { [key: string]: string | ShellQuotedString | undefined } | undefined): CommandLineBuilder {
        if (values !== undefined) {
            for (const key of Object.keys(values)) {
                if (typeof (values[key]) === 'string') {
                    this.withArg(name);
                    this.withArg(
                        {
                            value: `${key}=${values[key]}`,
                            quoting: ShellQuoting.Strong // The prior behavior was to quote
                        }
                    );
                } else if (values[key] !== undefined) {
                    this.withArg(name);
                    this.withArg(values[key]);
                }
            }
        }

        return this;
    }

    public withArrayArgs<T>(name: string, values: T[] | undefined, formatter?: (value: T) => string | ShellQuotedString): CommandLineBuilder {
        formatter = formatter || ((value: T) => value.toString());

        if (values !== undefined) {
            for (const value of values) {
                if (value !== undefined) {
                    const formatted = formatter(value);
                    if (typeof (formatted) === 'string') {
                        this.withArg(name);
                        this.withArg(
                            {
                                value: formatted,
                                quoting: ShellQuoting.Strong // The prior behavior was to quote
                            }
                        );
                    } else if (formatted !== undefined) {
                        this.withArg(name);
                        this.withArg(formatted);
                    }
                }
            }
        }

        return this;
    }

    public build(): string {
        return this.args.map(arg => {
            return arg.quoting === ShellQuoting.Strong ? `"${arg.value}"` : arg.value;
        }).join(' ');
    }

    public buildShellQuotedStrings(): ShellQuotedString[] {
        return this.args;
    }
}
