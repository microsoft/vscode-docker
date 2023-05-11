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
    | 'mipsle' // This is not a typo. Node.js uses `mipsel`, but Golang uses `mipsle`.
    | 'ppc64'
    | 's390x'
    | string;

/**
 * Returns native architecture of the current machine
 * See {@link https://go.dev/doc/install/source#environment}
 * @returns native architecture of the current machine
 */
export function getNativeArchitecture(): CpuArchitecture {
    const arch = os.arch() || 'amd64';
    switch (arch) {
        case 'ia32':
            return '386';
        case 'mipsel':
            return 'mipsle';
        case 'ppc':
            return 'ppc64';
        case 'x64':
            return 'amd64';
        default:
            return arch;
    }
}

