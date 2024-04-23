/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import * as vscode from 'vscode';

// Adapted from https://github.com/microsoft/vscode-python-debugger/blob/main/src/extension/api.ts
interface PythonDebuggerExtensionAPI {
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
        const debugPyExt = await getPythonDebuggerExtension();
        const debuggerPath = await debugPyExt?.exports?.debug?.getDebuggerPackagePath();

        if (debuggerPath) {
            return debuggerPath;
        }

        throw new Error(vscode.l10n.t('Unable to find the debugger in the Python extension.'));
    }

    export async function getPythonDebuggerExtension(): Promise<vscode.Extension<PythonDebuggerExtensionAPI>> | undefined {
        const debugPyExtensionId = 'ms-python.debugpy';
        const minPyExtensionVersion = new semver.SemVer('2024.5.11141010');

        const debugPyExt = vscode.extensions.getExtension(debugPyExtensionId);
        const button = vscode.l10n.t('Open Extension');

        if (!debugPyExt) {
            const response = await vscode.window.showErrorMessage(vscode.l10n.t('For debugging Python apps in a container to work, the Python Debugger extension must be installed.'), button);

            if (response === button) {
                await vscode.commands.executeCommand('extension.open', debugPyExtensionId);
            }

            return undefined;
        }

        const version = new semver.SemVer(debugPyExt.packageJSON.version);

        if (semver.lt(version, minPyExtensionVersion)) {
            await vscode.window.showErrorMessage(vscode.l10n.t('The installed Python Debugger extension does not meet the minimum requirements, please update to the latest version and try again.'));
            return undefined;
        }

        if (!debugPyExt.isActive) {
            await debugPyExt.activate();
        }

        return debugPyExt;
    }
}
/* eslint-enable @typescript-eslint/no-namespace, no-inner-declarations */
