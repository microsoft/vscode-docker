/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This will eventually be replaced by an API in the Python extension. See https://github.com/microsoft/vscode-python/issues/7282

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from "vscode";
import { localize } from '../../localize';

export namespace PythonExtensionHelper {
    export interface DebugLaunchOptions {
        host?: string;
        port?: number;
        wait?: boolean;
    }

    export async function getLauncherFolderPath(): Promise<string> {
        const pyExtensionId = 'ms-python.python';
        const pyExt = vscode.extensions.getExtension(pyExtensionId);
        const button = localize('vscode-docker.tasks.pythonExt.openExtension', 'Open Extension');

        if (!pyExt) {
            const response = await vscode.window.showErrorMessage(localize('vscode-docker.tasks.pythonExt.pythonExtensionNeeded', 'For debugging Python apps in a container to work, the Python extension must be installed.'), button);

            if (response === button) {
                await vscode.commands.executeCommand('extension.open', pyExtensionId);
            }

            return undefined;
        }

        await pyExt.activate();

        const debuggerPath = path.join(pyExt.extensionPath, 'pythonFiles', 'lib', 'python', 'debugpy', 'no_wheels');

        if ((await fse.pathExists(debuggerPath))) {
            return debuggerPath;
        }

        throw new Error(localize('vscode-docker.tasks.pythonExt.noDebugger', 'Unable to find the debugger in the Python extension.'));
    }
}
