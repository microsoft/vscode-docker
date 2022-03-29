/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { AsyncLazy } from './lazy';
import { ext } from '../extensionVariables';
import { execAsync } from './spawnAsync';

export const DefaultDockerPath: string = 'docker';

export const OldComposeCommand: string = 'docker-compose';
export const NewComposeCommand: string = 'docker compose';

export function dockerExePath(context?: IActionContext): string {
    const retval = vscode.workspace.getConfiguration('docker').get('dockerPath', DefaultDockerPath);
    if (retval !== DefaultDockerPath && context) {
        context.telemetry.properties.nonstandardDockerPath = 'true';
    }
    return retval;
}

// Create a lazy handler for getting the compose command lazily
const composeCommandLazy = new AsyncLazy<string>(async () => {
    const settingValue = vscode.workspace.getConfiguration('docker').get<string | undefined>('composeCommand');

    if (settingValue) {
        // If a value is configured by settings, we'll return it unconditionally
        return settingValue;
    }

    // Otherwise, autodetect!
    try {
        // Try running `docker compose version`...
        await execAsync(`${NewComposeCommand} version`);

        // If that command worked, then assume we should use it
        return NewComposeCommand;
    } catch {
        // Otherwise fall back to the old command
        return OldComposeCommand;
    }
});

// Register a listener to clear the value when the context changes
// Separately, because changes to the relevant settings (like `docker.composeCommand`) will automatically result in a context refresh, that will indirectly cause this to fire too
ext.context.subscriptions.push(
    ext.dockerContextManager.onContextChanged(() => composeCommandLazy.clear())
);

export async function getComposeCommand(context?: IActionContext): Promise<string> {
    const retval = await composeCommandLazy.getValue();

    if (context) {
        if (retval === NewComposeCommand || retval === OldComposeCommand) {
            context.telemetry.properties.composeCommand = retval;
        } else {
            context.telemetry.properties.composeCommand = 'other';
        }
    }

    return retval;
}
