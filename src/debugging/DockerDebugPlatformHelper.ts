/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerDebugConfiguration } from "./DockerDebugConfigurationProvider";


export type DockerPlatform = 'netCore' | 'node' | 'python' | 'netSdk';

export function getDebugPlatform(configuration: DockerDebugConfiguration): DockerPlatform | undefined {
    if (configuration.platform === 'netCore' || configuration.netCore !== undefined) {
        return configuration.netCore?.buildWithSdk ? 'netSdk' : 'netCore';
    } else if (configuration.platform === 'node' || configuration.node !== undefined) {
        return 'node';
    } else if (configuration.platform === 'python' || configuration.python !== undefined) {
        return 'python';
    } else {
        return undefined;
    }
}
