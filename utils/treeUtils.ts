/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ext } from '../extensionVariables';

export namespace treeUtils {
    export interface IThemedIconPath {
        light: string;
        dark: string;
    }

    export function getIconPath(iconName: string): string {
        return path.join(getImagesPath(), `${iconName}.svg`);
    }

    export function getThemedIconPath(iconName: string): IThemedIconPath {
        return {
            light: path.join(getImagesPath(), 'light', `${iconName}.svg`),
            dark: path.join(getImagesPath(), 'dark', `${iconName}.svg`)
        };
    }

    function getImagesPath(): string {
        return ext.context.asAbsolutePath('images');
    }
}
