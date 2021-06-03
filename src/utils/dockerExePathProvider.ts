/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';

export const DefaultDockerPath: string = 'docker';

export function dockerExePath(context?: IActionContext): string {
    const retval = vscode.workspace.getConfiguration('docker').get('dockerPath', DefaultDockerPath);
    if (retval !== DefaultDockerPath && context) {
        context.telemetry.properties.nonstandardDockerPath = 'true';
    }
    return retval;
}
