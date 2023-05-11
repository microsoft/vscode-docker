/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';

export type CpuArchitecture =
    | 'amd64'
    | '386'
    | 'arm64'
    | 'arm'
    | 'mips'
    | 'mipsle'
    | 'ppc64'
    | 's390x'
    | string;

/**
 * Returns native architecture of the current machine
 * @returns native architecture of the current machine
 */
export function getNativeArchitecture(): CpuArchitecture {
    switch (os.arch()) {
        case 'arm':
            return 'arm';
        case 'arm64':
            return 'arm64';
        case 'ia32':
            return '386';
        case 'mips':
            return 'mips';
        case 'mipsel':
            return 'mipsle';
        case 'ppc':
        case 'ppc64':
            return 'ppc64';
        case 's390x':
            return 's390x';
        case 'x64':
        default:
            return 'amd64';
    }
}

