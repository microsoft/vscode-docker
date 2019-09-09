/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { WorkspaceFolder } from 'vscode';

export function resolveFilePath(filePath: string, folder: WorkspaceFolder): string {
    let replacedPath = filePath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);

    if (os.platform() === 'win32') {
        replacedPath = replacedPath.replace(/\//g, '\\');
    } else {
        replacedPath = replacedPath.replace(/\\/g, '/');
    }

    return path.resolve(folder.uri.fsPath, replacedPath);
}

export function unresolveFilePath(filePath: string, folder: WorkspaceFolder): string {
    // tslint:disable-next-line: no-invalid-template-strings
    let replacedPath = filePath.replace(folder.uri.fsPath, '${workspaceFolder}');

    // By convention, VSCode uses forward slash for files in tasks/launch
    replacedPath = replacedPath.replace(/\\/g, '/');

    return replacedPath;
}
