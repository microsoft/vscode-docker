/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { cloneObject } from './cloneObject';

export function withDockerEnvSettings(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    const newEnv = cloneObject(baseEnv || {});
    const environmentSettings: NodeJS.ProcessEnv = workspace.getConfiguration('docker').get<NodeJS.ProcessEnv>('environment', {});

    for (const key of Object.keys(environmentSettings)) {
        newEnv[key] = environmentSettings[key];
    }

    return newEnv;
}
