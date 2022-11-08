/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListContainersItem } from "../../runtimes/docker";
import { ThemeColor, ThemeIcon } from "vscode";
import { localize } from "../../localize";
import { commonProperties, CommonProperty, getCommonPropertyValue } from "../settings/CommonProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type ContainerProperty = Exclude<CommonProperty, 'Size'> | 'Image' | 'Compose Project Name' | 'ContainerId' | 'ContainerName' | 'Networks' | 'Ports' | 'State' | 'Status';

export const containerProperties: ITreePropertyInfo<ContainerProperty>[] = [
    ...commonProperties,
    { property: 'ContainerId', exampleValue: 'fdeab20e859d' },
    { property: 'ContainerName', exampleValue: 'amazing_hoover' },
    { property: 'Image', exampleValue: 'alpine' },
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

export function getContainerPropertyValue(item: ListContainersItem, property: ContainerProperty): string {
    const networks = item.networks?.length > 0 ? item.networks : ['<none>'];
    const ports = item.ports?.length > 0 ? item.ports.map(p => p.hostPort) : ['<none>'];

    switch (property) {
        case 'ContainerId':
            return item.id.slice(0, 12);
        case 'ContainerName':
            return item.name;
        case 'Networks':
            return networks.join(',');
        case 'Ports':
            return ports.join(',');
        case 'State':
            return item.state;
        case 'Status':
            // The rapidly-refreshing status during a container's first minute causes a lot of problems with excessive refreshing
            // This normalizes things like "10 seconds" and "Less than a second" to "Less than a minute", meaning the refreshes don't happen constantly
            return item.status?.replace(/(\d+ seconds?)|(Less than a second)/i, localize('vscode-docker.tree.containers.lessThanMinute', 'Less than a minute'));
        case 'Compose Project Name':
            return getComposeProjectName(item);
        case 'Image':
            return item.image.originalName;
        default:
            return getCommonPropertyValue(item, property);
    }
}

export const NonComposeGroupName = localize('vscode-docker.tree.containers.otherContainers', 'Individual Containers');

export function getComposeProjectName(container: ListContainersItem): string {
    if (!container.labels) {
        return NonComposeGroupName;
    }

    const labels = Object.keys(container.labels)
        .map(label => ({ label: label, value: container.labels[label] }));

    const composeProject = labels.find(l => l.label === 'com.docker.compose.project');
    if (composeProject) {
        return composeProject.value;
    } else {
        return NonComposeGroupName;
    }
}
