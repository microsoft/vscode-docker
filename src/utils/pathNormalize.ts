/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import { isWindows } from './osUtils';
import { PlatformOS } from "./platform";

export function pathNormalize(targetPath: string, platformOS?: PlatformOS): string {
    platformOS = platformOS || (isWindows() ? 'Windows' : 'Linux');

    return platformOS === 'Windows' ?
        path.win32.normalize(targetPath).replace(/\//g, '\\') :
        path.posix.normalize(targetPath).replace(/\\/g, '/');
}

export function makeAbsolute(targetPath: string, maybeRelativeTo: string | WorkspaceFolder, platformOS?: PlatformOS): string {
    if (path.isAbsolute(targetPath)) {
        return targetPath;
    }

    const base = typeof maybeRelativeTo === 'string' ? maybeRelativeTo : maybeRelativeTo.uri.fsPath;
    platformOS = platformOS || (isWindows() ? 'Windows' : 'Linux');

    return platformOS === 'Windows' ?
        path.win32.join(base, targetPath) :
        path.posix.join(base, targetPath);
}
