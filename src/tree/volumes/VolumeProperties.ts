/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonProperty, commonProperties } from "../settings/CommonProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type VolumeProperty = CommonProperty | 'VolumeName';

export const volumeProperties: ITreePropertyInfo<VolumeProperty>[] = [
    ...commonProperties,
    { property: 'VolumeName', exampleValue: 'my-vol' },
];
