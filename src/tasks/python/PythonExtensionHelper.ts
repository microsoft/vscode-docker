/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This will eventually be replaced by an API in the Python extension. See https://github.com/microsoft/vscode-python/issues/7282

import * as semver from 'semver';
import * as vscode from "vscode";

// Adapted from https://github.com/microsoft/vscode-python/blob/main/src/client/api.ts
interface PythonExtensionAPI {
    debug: {
        getDebuggerPackagePath(): Promise<string | undefined>;
    }
}

/* eslint-disable @typescript-eslint/no-namespace, no-inner-declarations */
export namespace PythonExtensionHelper {
    export interface DebugLaunchOptions {
        host?: string;
        port?: number;
        wait?: boolean;
    }

    export async function getLauncherFolderPath(): Promise<string> {
        const pyExt = await getPythonExtension();
        const debuggerPath = await pyExt?.exports?.debug?.getDebuggerPackagePath();

        if (debuggerPath) {
            return debuggerPath;
        }

        throw new Error(vscode.l10n.t('Unable to find the debugger in the Python extension.'));
    }

    export async function getPythonExtension(): Promise<vscode.Extension<PythonExtensionAPI>> | undefined {
        const pyExtensionId = 'ms-python.python';
        const minPyExtensionVersion = new semver.SemVer('2020.11.367453362');

        const pyExt = vscode.extensions.getExtension(pyExtensionId);
        const button = vscode.l10n.t('Open Extension');

        if (!pyExt) {
            const response = await vscode.window.showErrorMessage(vscode.l10n.t('For debugging Python apps in a container to work, the Python extension must be installed.'), button);

            if (response === button) {
                await vscode.commands.executeCommand('extension.open', pyExtensionId);
            }

            return undefined;
        }

        const version = new semver.SemVer(pyExt.packageJSON.version);

        if (semver.lt(version, minPyExtensionVersion)) {
            await vscode.window.showErrorMessage(vscode.l10n.t('The installed Python extension does not meet the minimum requirements, please update to the latest version and try again.'));
            return undefined;
        }

        if (!pyExt.isActive) {
            await pyExt.activate();
        }

        return pyExt;
    }
}
/* eslint-enable @typescript-eslint/no-namespace, no-inner-declarations */
