/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandRunner, ShellStreamCommandRunnerFactory } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';

export function getDefaultShellCommandRunner(): () => CommandRunner {
    // Get environment settings
    const config = vscode.workspace.getConfiguration('docker');
    const environmentSettings = config.get<NodeJS.ProcessEnv>('environment', {});

    // Get a `ShellStreamCommandRunnerFactory`
    const factory = new ShellStreamCommandRunnerFactory({
        env: {
            ...process.env,
            ...environmentSettings,
        },
    });

    // Return the `getCommandRunner` method
    return factory.getCommandRunner;
}
