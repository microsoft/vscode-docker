/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n, ThemeColor, ThemeIcon, workspace } from "vscode";
import { ListContainersItem } from "../../runtimes/docker";
import { commonProperties, CommonProperty, getCommonPropertyValue } from "../settings/CommonProperties";
import { ITreePropertyInfo } from "../settings/ITreeSettingInfo";

export type ContainerProperty = Exclude<CommonProperty, 'Size'> | 'Image' | 'Compose Project Name' | 'ContainerId' | 'ContainerName' | 'Networks' | 'Ports' | 'State' | 'Status'| 'Label';

export const containerProperties: ITreePropertyInfo<ContainerProperty>[] = [
    ...commonProperties,
    { property: 'ContainerId', exampleValue: 'fdeab20e859d' },
    { property: 'ContainerName', exampleValue: 'amazing_hoover' },
    { property: 'Image', exampleValue: 'alpine' },
    { property: 'Networks', exampleValue: 'mybridge_network' },
    { property: 'Ports', exampleValue: '8080' },
    { property: 'State', exampleValue: 'exited' },
    { property: 'Status', exampleValue: 'Exited (0) 2 hours ago' },
    { property: 'Compose Project Name', description: l10n.t('Value used to associate containers launched by a \'docker-compose up\' command') },
    { property: 'Label', exampleValue: 'com.microsoft.created-by=visual-studio-code' },
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
            return item.status?.replace(/(\d+ seconds?)|(Less than a second)/i, l10n.t('Less than a minute'));
        case 'Compose Project Name':
            return getLabelGroup(item, 'com.docker.compose.project', NonComposeGroupName);
        case 'Image':
            return item.image.originalName;
        case 'Label':
            return getLabelGroup(item, workspace.getConfiguration('docker')?.get<string | undefined>('containers.groupByLabel', undefined), NonLabelGroupName);
        default:
            return getCommonPropertyValue(item, property);
    }
}

export const NonComposeGroupName = l10n.t('Individual Containers');
export const NonLabelGroupName = l10n.t('Others');

export function getLabelGroup(container: ListContainersItem, label: string | undefined, defaultGroupName: string): string {
    if (!label) {
        return defaultGroupName;
    }

    const containerLabels = container?.labels;
    return containerLabels?.[label] || defaultGroupName;
}
