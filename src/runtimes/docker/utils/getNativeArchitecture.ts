/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';

/**
 * Returns native architecture of the current machine
 * @returns native architecture of the current machine
 */
export function getNativeArchitecture(): 'amd64' | '386' | 'arm64' | 'arm' {
    switch (os.arch()) {
        case 'arm':
            return 'arm';
        case 'arm64':
            return 'arm64';
        case 'ia32':
            return '386';
        case 'x64':
        default:
            return 'amd64';
    }
}
