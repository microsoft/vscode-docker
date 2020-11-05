/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ThemeIcon, Uri } from 'vscode';
import { ext } from '../extensionVariables';

export type IconPath = string | Uri | { light: string | Uri; dark: string | Uri } | ThemeIcon;

export function getIconPath(iconName: string): IconPath {
    return path.join(getResourcesPath(), `${iconName}.svg`);
}

export function getThemedIconPath(iconName: string): IconPath {
    return {
        light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
        dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
    };
}

function getResourcesPath(): string {
    return ext.context.asAbsolutePath('resources');
}
