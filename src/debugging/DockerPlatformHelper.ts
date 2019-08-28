/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerPlatform = 'netCore' | 'node';

interface DockerPlatformConfiguration {
    platform?: DockerPlatform;
    netCore?: {};
    node?: {};
}

export function getPlatform<T extends DockerPlatformConfiguration>(configuration: T): DockerPlatform | undefined {
    if (configuration.platform === 'netCore' || configuration.netCore !== undefined) {
        return 'netCore'
    } else if (configuration.platform === 'node' || configuration.node !== undefined) {
        return 'node';
    } else {
        return undefined;
    }
}
