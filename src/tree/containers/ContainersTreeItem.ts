/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { callDockerodeAsync } from "../../utils/callDockerode";
import { getThemedIconPath } from "../IconPath";
import { getImagePropertyValue } from "../images/ImageProperties";
import { ILocalItem, LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { containerProperties, ContainerProperty } from "./ContainerProperties";
import { ContainerTreeItem } from "./ContainerTreeItem";
import { ILocalContainerInfo, LocalContainerInfo, NonComposeGroupName } from "./LocalContainerInfo";

export class ContainersTreeItem extends LocalRootTreeItemBase<ILocalContainerInfo, ContainerProperty> {
    public treePrefix: string = 'containers';
    public label: string = localize('vscode-docker.tree.containers.label', 'Containers');
    public configureExplorerTitle: string = localize('vscode-docker.tree.containers.configure', 'Configure containers explorer');

    public childType: LocalChildType<ILocalContainerInfo> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<ILocalContainerInfo, ContainerProperty> = ContainerGroupTreeItem;

    private newContainerUser: boolean = false;

    public constructor(parent: AzExtParentTreeItem | undefined) {
        super(parent);
        this.newContainerUser = this.isNewContainerUser();
    }

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
        const localItems = items.map(c => new LocalContainerInfo(c));
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.updateNewContainerUser(localItems);
        return localItems;
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
            case 'Compose Project Name':
                return item.composeProjectName;
            default:
                return getImagePropertyValue(item, property);
        }
    }

    public compareChildrenImpl(ti1: ContainerTreeItem, ti2: ContainerTreeItem): number {
        // Override the sorting behavior to keep the non compose group at the bottom when
        // grouped by compose project name.
        if (this.failedToConnect) {
            return 0; // children are already sorted
        }
        if (this.groupBySetting === 'Compose Project Name'
            && ti1 instanceof this.childGroupType && ti2 instanceof this.childGroupType
            && (ti1.label === NonComposeGroupName || ti2.label === NonComposeGroupName)) {
            if (ti1.label === ti2.label) {
                return 0;
            } else {
                return ti1.label === NonComposeGroupName ? 1 : -1;
            }
        }
        return super.compareChildrenImpl(ti1, ti2);
    }

    protected getTreeItemForEmptyList(): AzExtTreeItem[] {
        if (this.newContainerUser) {
            const dockerTutorialTreeItem = new OpenUrlTreeItem(this, localize('vscode-docker.tree.container.gettingStarted', 'Get started with Docker containers...'), 'https://aka.ms/getstartedwithdocker');
            dockerTutorialTreeItem.iconPath = getThemedIconPath('docker')
            return [dockerTutorialTreeItem];
        }
        return super.getTreeItemForEmptyList()
    }

    private isNewContainerUser(): boolean {
        return ext.context.globalState.get<boolean>('vscode-docker.container.newContainerUser', true);
    }

    private async updateNewContainerUser(items: ILocalItem[]): Promise<void> {
        if (this.newContainerUser && items && items.length > 0) {
            this.newContainerUser = false;
            await ext.context.globalState.update('vscode-docker.container.newContainerUser', false);
        }
    }
}
