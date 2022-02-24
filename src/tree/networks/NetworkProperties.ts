/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonProperty, commonProperties } from "../settings/CommonProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type NetworkProperty = CommonProperty | 'NetworkDriver' | 'NetworkId' | 'NetworkName';

export const networkProperties: ITreePropertyInfo<NetworkProperty>[] = [
    ...commonProperties,
    { property: 'NetworkDriver', exampleValue: 'bridge' },
    { property: 'NetworkId', exampleValue: 'ad0bd70488d1' },
    { property: 'NetworkName', exampleValue: 'my-network' },
];
