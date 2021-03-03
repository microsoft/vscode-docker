/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ext } from '../extensionVariables';

export function getThemedIconPath(iconName: string): { light: string, dark: string } {
    return {
        light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
        dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
    };
}

export function getIconPath(iconName: string): string {
    return path.join(getResourcesPath(), `${iconName}.svg`);
}

function getResourcesPath(): string {
    return ext.context.asAbsolutePath('resources');
}
