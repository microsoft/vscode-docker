/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { callDockerodeAsync } from "../../utils/callDockerode";
import { getImagePropertyValue } from "../images/ImageProperties";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { containerProperties, ContainerProperty } from "./ContainerProperties";
import { ContainerTreeItem } from "./ContainerTreeItem";
import { ILocalContainerInfo, LocalContainerInfo } from "./LocalContainerInfo";

export class ContainersTreeItem extends LocalRootTreeItemBase<ILocalContainerInfo, ContainerProperty> {
    public treePrefix: string = 'containers';
    public label: string = localize('vscode-docker.tree.containers.label', 'Containers');
    public configureExplorerTitle: string = localize('vscode-docker.tree.containers.configure', 'Configure containers explorer');

    public childType: LocalChildType<ILocalContainerInfo> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<ILocalContainerInfo, ContainerProperty> = ContainerGroupTreeItem;

    public labelSettingInfo: ITreeSettingInfo<ContainerProperty> = {
        properties: containerProperties,
        defaultProperty: 'FullTag',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<ContainerProperty> = {
        properties: containerProperties,
        defaultProperty: ['ContainerName', 'Status'],
    };

    public groupBySettingInfo: ITreeSettingInfo<ContainerProperty | CommonGroupBy> = {
        properties: [...containerProperties, groupByNoneProperty],
        defaultProperty: 'None',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'container' : 'container group';
    }

    public async getItems(): Promise<ILocalContainerInfo[]> {
        const options = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };

        const items = await callDockerodeAsync(async () => ext.dockerode.listContainers(options)) || [];
        return items.map(c => new LocalContainerInfo(c));
    }

    public getPropertyValue(item: ILocalContainerInfo, property: ContainerProperty): string {
        switch (property) {
            case 'ContainerId':
                return item.containerId.slice(0, 12);
            case 'ContainerName':
                return item.containerName;
            case 'Networks':
                return item.networks.length > 0 ? item.networks.join(',') : '<none>';
            case 'Ports':
                return item.ports.length > 0 ? item.ports.join(',') : '<none>';
            case 'State':
                return item.state;
            case 'Status':
                return item.status;
            default:
                return getImagePropertyValue(item, property);
        }
    }
}
