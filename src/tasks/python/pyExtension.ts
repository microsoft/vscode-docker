/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This will eventually be replaced by an API in the Python extension. See https://github.com/microsoft/vscode-python/issues/7282

import * as path from 'path';
import { extensions } from 'vscode';

export namespace pyExtension {
    export interface FileTarget {
        file: string;
    }

    export interface ModuleTarget {
        module: string;
    }

    export interface DebugLaunchOptions {
        host?: string;
        port?: number;
        wait?: boolean;
    }

    export async function getRemoteLauncherCommand(target: FileTarget | ModuleTarget, args?: string[], options?: DebugLaunchOptions): Promise<string> {
        let fullTarget: string;
        if ((target as FileTarget).file) {
            fullTarget = (target as FileTarget).file;
        } else if ((target as ModuleTarget).module) {
            fullTarget = `-m ${(target as ModuleTarget).module}`;
        } else {
            throw new Error('One of either module or file must be given.');
        }

        options = options || {};
        options.host = options.host || '0.0.0.0';
        options.port = options.port || 5678;
        options.wait = !!options.wait;
        args = args || [];

        const launcherFolder = await getLauncherFolderPath();

        return `python3 ${path.join(launcherFolder, 'ptvsd_launcher.py')} --default --host ${options.host} --port ${options.port} ${options.wait ? '--wait' : ''} ${fullTarget} ${args.join(' ')}`;
    }

    export async function getLauncherFolderPath(): Promise<string> {
        const pyExt = extensions.getExtension('ms-python.python');

        if (!pyExt) {
            throw new Error('The Python extension must be installed.');
        }

        return path.join(pyExt.extensionPath, 'pythonFiles');
    }
}
