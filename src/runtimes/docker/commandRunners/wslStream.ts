/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
    CommandResponse,
    ICommandRunnerFactory,
} from '../contracts/CommandRunner';
import { Shell } from '../utils/spawnStreamAsync';
import {
    ShellStreamCommandRunnerFactory,
    ShellStreamCommandRunnerOptions,
} from './shellStream';

export type WslShellCommandRunnerOptions = ShellStreamCommandRunnerOptions & {
    wslPath?: string;
    distro?: string | null;
};

/**
 * Special case of {@link ShellStreamCommandRunnerFactory} for executing commands in a wsl distro
 */
export class WslShellCommandRunnerFactory extends ShellStreamCommandRunnerFactory<WslShellCommandRunnerOptions> implements ICommandRunnerFactory {
    protected override getCommandAndArgs(
        commandResponse: CommandResponse<unknown>,
    ): {
        command: string;
        args: string[];
    } {
        const command = this.options.wslPath ?? 'wsl.exe';
        const args = [
            ...(this.options.distro ? ['-d', this.options.distro] : []),
            '--',
            commandResponse.command,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ...Shell.getShellOrDefault(this.options.shellProvider).quote(commandResponse.args),
        ];

        return { command, args };
    }
}
