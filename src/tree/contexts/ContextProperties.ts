/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commonProperties, CommonProperty } from "../settings/CommonProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type ContextProperty = CommonProperty | 'Name' | 'Description' | 'DockerEndpoint';

export const contextProperties: ITreePropertyInfo<ContextProperty>[] = [
    ...commonProperties,
    { property: 'Name', exampleValue: 'my-context' },
    { property: 'Description', exampleValue: 'remote linux VM on Azure' },
    { property: 'DockerEndpoint', exampleValue: 'my-ssh://user1@55.55.5.555' }
];
