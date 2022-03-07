/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeColor, ThemeIcon } from "vscode";
import { localize } from "../../localize";
import { ImageProperty, imageProperties } from "../images/ImageProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type ContainerProperty = ImageProperty | 'Compose Project Name' | 'ContainerId' | 'ContainerName' | 'Networks' | 'Ports' | 'State' | 'Status';

export const containerProperties: ITreePropertyInfo<ContainerProperty>[] = [
    ...imageProperties.filter(p => p.property !== 'Size'), // Don't include size as a container property
    { property: 'ContainerId', exampleValue: 'fdeab20e859d' },
    { property: 'ContainerName', exampleValue: 'amazing_hoover' },
    { property: 'Networks', exampleValue: 'mybridge_network' },
    { property: 'Ports', exampleValue: '8080' },
    { property: 'State', exampleValue: 'exited' },
    { property: 'Status', exampleValue: 'Exited (0) 2 hours ago' },
    { property: 'Compose Project Name', description: localize('vscode-docker.tree.containers.properties.composeProjectName', 'Value used to associate containers launched by a \'docker-compose up\' command') },
];

export function getContainerStateIcon(state: string): ThemeIcon {
    switch (state.toLowerCase()) {
        case 'created':
        case 'dead':
        case 'exited':
        case 'removing':
        case 'terminated':
        case 'unknown':
        case 'waiting':
            return new ThemeIcon('debug-stop', new ThemeColor('debugIcon.stopForeground'));
        case 'paused':
            return new ThemeIcon('debug-pause', new ThemeColor('debugIcon.pauseForeground'));
        case 'restarting':
            return new ThemeIcon('debug-restart', new ThemeColor('debugIcon.restartForeground'));
        case 'running':
        default:
            return new ThemeIcon('debug-start', new ThemeColor('debugIcon.startForeground'));
    }
}
