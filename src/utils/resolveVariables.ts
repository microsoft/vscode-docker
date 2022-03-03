/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { WorkspaceFolder, window, workspace } from 'vscode';
import { cloneObject } from '../utils/cloneObject';

const variableMatcher: RegExp = /\$\{[a-z.\-_:]+\}/ig;
const configVariableMatcher: RegExp = /\$\{config:([a-z.\-_]+)\}/i;

export function resolveVariables<T>(target: T, folder?: WorkspaceFolder, additionalVariables?: { [key: string]: string }): T {
    if (!target) {
        return target;
    } else if (typeof (target) === 'string') {
        return target.replace(variableMatcher, (match: string) => {
            return resolveSingleVariable(match, folder, additionalVariables);
        }) as unknown as T;
    } else if (typeof (target) === 'number') {
        return target;
    } else if (Array.isArray(target)) {
        // tslint:disable-next-line: no-unsafe-any
        return target.map(value => resolveVariables(value, folder, additionalVariables)) as unknown as T;
    } else {
        const result = cloneObject(target);
        for (const key of Object.keys(target)) {
            result[key] = resolveVariables(target[key], folder, additionalVariables);
        }

        return result;
    }
}

function resolveSingleVariable(variable: string, folder?: WorkspaceFolder, additionalVariables?: { [key: string]: string }): string {
    /* eslint-disable no-template-curly-in-string */

    // Replace workspace folder variables
    if (folder) {
        switch (variable) {
            case '${workspaceFolder}':
            case '${workspaceRoot}':
                return path.normalize(folder.uri.fsPath);
            case '${userHome}':
                return os.homedir();
            case '${relativeFile}':
                return path.relative(path.normalize(folder.uri.fsPath), getActiveFilePath());
            default:
        }
    }

    // Replace additional variables
    const variableNameOnly = variable.replace(/[${}]/ig, '');
    const replacement = additionalVariables?.[variable] ?? additionalVariables?.[variableNameOnly];
    if (replacement !== undefined) {
        return replacement;
    }

    // Replace config variables
    const configMatch = configVariableMatcher.exec(variable);
    if (configMatch && configMatch.length > 1) {
        const configName: string = configMatch[1]; // Index 1 is the "something.something" group of "${config:something.something}"
        const config = workspace.getConfiguration();
        const configValue = config.get(configName);

        // If it's a simple value we'll return it
        if (typeof (configValue) === 'string') {
            return configValue;
        } else if (typeof (configValue) === 'number' || typeof (configValue) === 'boolean') {
            return configValue.toString();
        }
    }

    // Replace other variables
    switch (variable) {
        case '${file}':
            return getActiveFilePath();
        default:
    }

    return variable; // Return as-is, we don't know what to do with it

    /* eslint-enable no-template-curly-in-string */
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
    /* eslint-disable-next-line no-template-curly-in-string */
    let replacedPath = filePath.replace(folder.uri.fsPath, '${workspaceFolder}');

    // By convention, VSCode uses forward slash for files in tasks/launch
    replacedPath = replacedPath.replace(/\\/g, '/');

    return replacedPath;
}
