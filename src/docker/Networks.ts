/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerObject } from './Common';

export type DriverType = 'bridge' | 'host' | 'macvlan' | 'nat' | 'transparent';

export interface DockerNetwork extends DockerObject {
    readonly Driver: DriverType;
}

export interface DockerNetworkInspection extends DockerObject {
    readonly Driver: DriverType;
    readonly IPAM: {
        readonly Config: [
            {
                readonly Gateway: string;
            }
        ]
    }
}
