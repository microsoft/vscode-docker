/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';

export function getValidImageName(nameHint: string): string {
    return nameHint.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'image';
}

export function getValidImageNameFromPath(appPath: string, tag?: string): string {
    const hint = path.parse(appPath).name;

    return tag ? getValidImageNameWithTag(hint, tag) : getValidImageName(hint);
}

export function getValidImageNameWithTag(nameHint: string, tag: string): string {
    return `${getValidImageName(nameHint)}:${tag}`;
}
