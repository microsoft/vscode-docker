/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as cp from 'child_process';
import { IActionContext } from 'vscode-azureextensionui';

export const DefaultDockerPath: string = 'docker';
export const DefaultPodmanPath: string = 'podman';

export function dockerExePath(context?: IActionContext): string {
    let retval: string = vscode.workspace.getConfiguration('docker').get('dockerPath', '');
    if (retval === '') {
        try {
            cp.execFileSync(DefaultPodmanPath, ['version'], { stdio: 'ignore' });
            retval = DefaultPodmanPath;
        }
        catch {
            retval = DefaultDockerPath;
        }
    }
    if (retval !== DefaultDockerPath && context) {
        context.telemetry.properties.nonstandardDockerPath = 'true';
    }
    return retval;
}
