/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { DockerContainer } from "../../docker/Containers";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { getImagePropertyValue } from "../images/ImageProperties";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { ContainerProperty, containerProperties } from "./ContainerProperties";
import { ContainerTreeItem } from "./ContainerTreeItem";

export type DockerContainerInfo = DockerContainer & {
    showFiles: boolean;
};

export class ContainersTreeItem extends LocalRootTreeItemBase<DockerContainerInfo, ContainerProperty> {
    public treePrefix: string = 'containers';
    public label: string = localize('vscode-docker.tree.containers.label', 'Containers');
    public configureExplorerTitle: string = localize('vscode-docker.tree.containers.configure', 'Configure containers explorer');

    public childType: LocalChildType<DockerContainerInfo> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<DockerContainerInfo, ContainerProperty> = ContainerGroupTreeItem;

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

    public async getItems(context: IActionContext): Promise<DockerContainerInfo[]> {
        const rawResults = await ext.dockerClient.getContainers(context);

        // NOTE: We *know* that ACI doesn't currently support showing files, but we'll give the benefit of the doubt to any other context type.
        const contextType = (await ext.dockerContextManager.getCurrentContext())?.ContextType;
        const showFiles = contextType && (contextType !== 'aci');

        const results = rawResults.map(result => ({ showFiles, ...result }));

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.updateNewContainerUser(results);
        return results;
    }

    public getPropertyValue(item: DockerContainerInfo, property: ContainerProperty): string {
        const networks = item.NetworkSettings?.Networks && Object.keys(item.NetworkSettings.Networks).length > 0 ? Object.keys(item.NetworkSettings.Networks) : ['<none>'];
        const ports = item.Ports?.length > 0 ? item.Ports.map(p => p.PublicPort) : ['<none>'];

        switch (property) {
            case 'ContainerId':
                return item.Id.slice(0, 12);
            case 'ImageId':
                return item.ImageID.replace('sha256:', '').slice(0, 12);
            case 'ContainerName':
                return item.Name;
            case 'Networks':
                return networks.join(',');
            case 'Ports':
                return ports.join(',');
            case 'State':
                return item.State;
            case 'Status':
                // The rapidly-refreshing status during a container's first minute causes a lot of problems with excessive refreshing
                // This normalizes things like "10 seconds" to "Less than a minute", meaning the refreshes don't happen constantly
                return item.Status?.replace(/\d+ seconds?/i, localize('vscode-docker.tree.containers.lessThanMinute', 'Less than a minute'));
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
            const dockerTutorialTreeItem = new OpenUrlTreeItem(this, localize('vscode-docker.tree.container.gettingStarted', 'Tutorial: Get started with Docker'), 'https://aka.ms/getstartedwithdocker');
            dockerTutorialTreeItem.iconPath = new ThemeIcon('link-external');
            return [dockerTutorialTreeItem];
        }
        return super.getTreeItemForEmptyList();
    }

    protected areArraysEqual(array1: DockerContainerInfo[] | undefined, array2: DockerContainerInfo[] | undefined): boolean {
        if (!super.areArraysEqual(array1, array2)) {
            // If they aren't the same according to the base class implementation, they are definitely not the same according to this either
            return false;
        }

        // If they are both undefined, return true
        // If only one is undefined, return false
        // This matches the behavior of the base class implementation, and guards against null refs below
        if (array1 === undefined && array2 === undefined) {
            return true;
        } else if (array1 === undefined || array2 === undefined) {
            return false;
        }

        // Containers' labels/descriptions (status in particular) can change. If they do, we want to cause a refresh. But, we also don't want to change the tree ID based on status (in `getTreeId()` in LocalRootTreeItemBase.ts).
        return !array1.some((item, index) => {
            return this.getTreeItemLabel(item) !== this.getTreeItemLabel(array2[index]) ||
                this.getTreeItemDescription(item) !== this.getTreeItemDescription(array2[index]);
        });
    }

    private isNewContainerUser(): boolean {
        return ext.context.globalState.get<boolean>('vscode-docker.container.newContainerUser', true);
    }

    private async updateNewContainerUser(items: DockerContainerInfo[]): Promise<void> {
        if (this.newContainerUser && items && items.length > 0) {
            this.newContainerUser = false;
            await ext.context.globalState.update('vscode-docker.container.newContainerUser', false);
        }
    }
}

export const NonComposeGroupName = localize('vscode-docker.tree.containers.otherContainers', 'Individual Containers');

export function getComposeProjectName(container: DockerContainer): string {
    if (!container.Labels) {
        return NonComposeGroupName;
    }

    const labels = Object.keys(container.Labels)
        .map(label => ({ label: label, value: container.Labels[label] }));

    const composeProject = labels.find(l => l.label === 'com.docker.compose.project');
    if (composeProject) {
        return composeProject.value;
    } else {
        return NonComposeGroupName;
    }
}
