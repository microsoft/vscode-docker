/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { window, WorkspaceFolder } from 'vscode';
import { cloneObject } from '../utils/cloneObject';

export function resolveVariables<T>(target: T, folder: WorkspaceFolder): T {
    if (!target) {
        return target;
    } else if (typeof (target) === 'string') {
        return target.replace(/\$\{[a-z]+\}/ig, (match: string) => {
            return resolveSingleVariable(match, folder);
        }) as unknown as T;
    } else if (typeof (target) === 'number') {
        return target;
    } else if (Array.isArray(target)) {
        // tslint:disable-next-line: no-unsafe-any
        return target.map(value => resolveVariables(value, folder)) as unknown as T;
    } else {
        const result = cloneObject(target);
        for (const key of Object.keys(target)) {
            result[key] = resolveVariables(target[key], folder);
        }

        return result;
    }
}

function resolveSingleVariable(variable: string, folder: WorkspaceFolder): string {
    // tslint:disable: no-invalid-template-strings
    switch (variable) {
        case '${workspaceFolder}':
        case '${workspaceRoot}':
            return path.normalize(folder.uri.fsPath);
        case '${file}':
            return getActiveFilePath();
        case '${relativeFile}':
            return path.relative(path.normalize(folder.uri.fsPath), getActiveFilePath());
        default:
            return variable; // Return as-is, we don't know what to do with it
    }
    // tslint:enable: no-invalid-template-strings
}

function getActiveFilePath(): string | undefined {
    return window.activeTextEditor &&
        window.activeTextEditor.document &&
        window.activeTextEditor.document.fileName &&
        path.normalize(window.activeTextEditor.document.fileName);
}

/**
 * Given an absolute file path, tries to make it relative to the workspace folder.
 * @param filePath The file path to make relative
 * @param folder The workspace folder
 */
export function unresolveWorkspaceFolder(filePath: string, folder: WorkspaceFolder): string {
    // tslint:disable-next-line: no-invalid-template-strings
    let replacedPath = filePath.replace(folder.uri.fsPath, '${workspaceFolder}');

    // By convention, VSCode uses forward slash for files in tasks/launch
    replacedPath = replacedPath.replace(/\\/g, '/');

    return replacedPath;
}
