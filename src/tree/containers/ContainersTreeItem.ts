/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerContainer } from "../../docker/Containers";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { getThemedIconPath } from "../IconPath";
import { getImagePropertyValue } from "../images/ImageProperties";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { containerProperties, ContainerProperty } from "./ContainerProperties";
import { ContainerTreeItem } from "./ContainerTreeItem";

export class ContainersTreeItem extends LocalRootTreeItemBase<DockerContainer, ContainerProperty> {
    public treePrefix: string = 'containers';
    public label: string = localize('vscode-docker.tree.containers.label', 'Containers');
    public configureExplorerTitle: string = localize('vscode-docker.tree.containers.configure', 'Configure containers explorer');

    public childType: LocalChildType<DockerContainer> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<DockerContainer, ContainerProperty> = ContainerGroupTreeItem;

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

    public async getItems(context: IActionContext): Promise<DockerContainer[]> {
        const results = await ext.dockerClient.getContainers(context);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.updateNewContainerUser(results);
        return results;
    }

    public getPropertyValue(item: DockerContainer, property: ContainerProperty): string {
        const networks = item.NetworkSettings?.Networks?.length > 0 ? Object.keys(item.NetworkSettings.Networks) : ['<none>'];
        const ports = item.Ports?.length > 0 ? item.Ports.map(p => p.PublicPort) : ['<none>'];

        switch (property) {
            case 'ContainerId':
                return item.Id.slice(0, 12);
            case 'ContainerName':
                return item.Name;
            case 'Networks':
                return networks.join(',');
            case 'Ports':
                return ports.join(',');
            case 'State':
                return item.State;
            case 'Status':
                return item.Status;
            case 'Compose Project Name':
                return getComposeProjectName(item);
            default:
                return getImagePropertyValue({ ...item, Name: item.Image }, property);
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

    private async updateNewContainerUser(items: DockerContainer[]): Promise<void> {
        if (this.newContainerUser && items && items.length > 0) {
            this.newContainerUser = false;
            await ext.context.globalState.update('vscode-docker.container.newContainerUser', false);
        }
    }
}

const NonComposeGroupName = localize('vscode-docker.tree.containers.otherContainers', 'Other Containers');

function getComposeProjectName(container: DockerContainer): string {
    const labels = Object.keys(container.Labels)
        .map(label => ({ label: label, value: container.Labels[label] }));

    const composeProject = labels.find(l => l.label === 'com.docker.compose.project');
    if (composeProject) {
        return composeProject.value;
    } else {
        return NonComposeGroupName;
    }
}
