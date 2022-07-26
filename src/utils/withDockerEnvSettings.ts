/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cloneObject } from './cloneObject';

export function withDockerEnvSettings(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const newEnv = cloneObject(baseEnv || {});
    const environmentSettings: NodeJS.ProcessEnv = workspace.getConfiguration('containers').get<NodeJS.ProcessEnv>('environment', {});

    for (const key of Object.keys(environmentSettings)) {
        ext.outputChannel.appendLine(localize('vscode-docker.utils.env.overwriting', 'WARNING: Overwriting environment variable "{0}" from VS Code setting "containers.environment".', key));
        newEnv[key] = environmentSettings[key];
    }

    return newEnv;
}
