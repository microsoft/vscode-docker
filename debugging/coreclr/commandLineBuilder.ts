export type CommandLineArgFactory = () => (string | undefined);

export class CommandLineBuilder {
    private readonly args: CommandLineArgFactory[] = [];

    public static create(...args: (undefined | string | CommandLineArgFactory)[]): CommandLineBuilder {
        let builder = new CommandLineBuilder();

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg) {
                if (typeof arg === 'string') {
                    builder = builder.withArg(arg);
                } else {
                    builder = builder.withArgFactory(arg);
                }
            }
        }

        return builder;
    }

    public build(): string {
        return this.args.map(arg => arg()).filter(arg => arg !== undefined).join(' ');
    }

    public withArg(arg: string | undefined): CommandLineBuilder {
        return this.withArgFactory(() => arg);
    }

    public withArrayArgs<T>(name: string, values: T[] | undefined, formatter?: (T) => string): CommandLineBuilder {
        formatter = formatter || ((value: T) => value.toString());

        return this.withArgFactory(() => values ? values.map(value => `${name} "${formatter(value)}"`).join(' ') : undefined);
    }

    public withArgFactory(factory: CommandLineArgFactory): CommandLineBuilder {
        this.args.push(factory);

        return this;
    }

    public withFlagArg(name: string, value: boolean | undefined) {
        return this.withArgFactory(() => value ? name : undefined);
    }

    public withKeyValueArgs(name: string, values: { [key: string]: string }): CommandLineBuilder {
        return this.withArgFactory(() => {
            if (values) {
                const keys = Object.keys(values);

                if (keys.length > 0) {
                    return keys.map(key => `${name} "${key}=${values[key]}"`).join(' ');
                }
            }

            return undefined;
        });
    }

    public withNamedArg(name: string, value: string | undefined): CommandLineBuilder {
        return this.withArgFactory(() => value ? `${name} "${value}"` : undefined);
    }

    public withQuotedArg(value: string | undefined) {
        return this.withArgFactory(() => value ? `"${value}"` : undefined);
    }
}

export default CommandLineBuilder;
