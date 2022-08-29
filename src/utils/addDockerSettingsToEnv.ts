/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export function addDockerSettingsToEnv(newEnv: NodeJS.ProcessEnv, oldEnv: NodeJS.ProcessEnv): void {
    const environmentSettings: NodeJS.ProcessEnv = workspace.getConfiguration('docker').get<NodeJS.ProcessEnv>('environment', {});

    for (const key of Object.keys(environmentSettings)) {
        ext.outputChannel.appendLine(localize('vscode-docker.utils.env.overwriting', 'WARNING: Overwriting environment variable "{0}" from VS Code setting "docker.environment".', key));
        newEnv[key] = environmentSettings[key];
    }
}
