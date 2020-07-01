/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "../../localize";
import { getThemedIconPath, IconPath } from "../IconPath";
import { imageProperties, ImageProperty } from "../images/ImageProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type ContainerProperty = ImageProperty | 'Compose Project Name' | 'ContainerId' | 'ContainerName' | 'Networks' | 'Ports' | 'State' | 'Status';

export const containerProperties: ITreePropertyInfo<ContainerProperty>[] = [
    ...imageProperties,
    { property: 'ContainerId', exampleValue: 'fdeab20e859d' },
    { property: 'ContainerName', exampleValue: 'amazing_hoover' },
    { property: 'Networks', exampleValue: 'mybridge_network' },
    { property: 'Ports', exampleValue: '8080' },
    { property: 'State', exampleValue: 'exited' },
    { property: 'Status', exampleValue: 'Exited (0) 2 hours ago' },
    { property: 'Compose Project Name', description: localize('vscode-docker.tree.containers.properties.composeProjectName', 'Value used to associate containers launched by a \'docker-compose up\' command') },
];

export function getContainerStateIcon(state: string): IconPath {
    let icon: string;
    switch (state.toLowerCase()) {
        case 'created':
        case 'dead':
        case 'exited':
        case 'removing':
        case 'terminated':
        case 'waiting':
            icon = 'statusStop';
            break;
        case 'paused':
            icon = 'statusPause';
            break;
        case 'restarting':
            icon = 'restart';
            break;
        case 'running':
        default:
            icon = 'statusRun';
    }
    return getThemedIconPath(icon);
}
