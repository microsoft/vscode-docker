/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';

/**
 * Given a path to an application, creates a valid Docker image name based on that path
 * @param appPath The application path to make an image name from (e.g. the app folder, .NET Core project file, etc.)
 */
export function getValidImageName(appPath: string, tag?: string): string {
    let result = path.parse(appPath).name.replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (result.length === 0) {
        result = 'image'
    }

    return tag ? `${result}:${tag}` : result;
}
