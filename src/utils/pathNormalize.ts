/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { PlatformOS } from "./platform";

export function pathNormalize(targetPath: string, platformOS?: PlatformOS): string {
    platformOS = platformOS || (os.platform() === 'win32' ? 'Windows' : 'Linux');

    return platformOS === 'Windows' ?
        path.win32.normalize(targetPath).replace(/\//g, '\\') :
        path.posix.normalize(targetPath).replace(/\\/g, '/');
}
