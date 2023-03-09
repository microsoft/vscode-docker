/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, ThemeIcon } from "vscode";
import { ext } from "../../extensionVariables";
import { ListContainersItem } from "../../runtimes/docker";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { OpenUrlTreeItem } from "../OpenUrlTreeItem";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { TreePrefix } from "../TreePrefix";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { containerProperties, ContainerProperty, getContainerPropertyValue, NonComposeGroupName, NonLabelGroupName } from "./ContainerProperties";
import { ContainerTreeItem } from "./ContainerTreeItem";

export type DockerContainerInfo = ListContainersItem & {
    showFiles: boolean;
};

export class ContainersTreeItem extends LocalRootTreeItemBase<DockerContainerInfo, ContainerProperty> {
    public treePrefix: TreePrefix = 'containers';
    public label: string = l10n.t('Containers');
    public configureExplorerTitle: string = l10n.t('Configure containers explorer');

    public childType: LocalChildType<DockerContainerInfo> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<DockerContainerInfo, ContainerProperty> = ContainerGroupTreeItem;

    private newContainerUser: boolean = false;

    public constructor(parent: AzExtParentTreeItem | undefined) {
        super(parent);
        this.newContainerUser = this.isNewContainerUser();
    }

    public labelSettingInfo: ITreeSettingInfo<ContainerProperty> = {
        properties: containerProperties,
        defaultProperty: 'Image',
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
        const rawResults = await ext.runWithDefaults(client =>
            client.listContainers({ all: true })
        );

        const results = rawResults.map(result => ({ showFiles: true, ...result }));

        // Don't wait
        void this.updateNewContainerUser(results);

        return results;
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
        else if (this.groupBySetting === 'Label'
            && ti1 instanceof this.childGroupType && ti2 instanceof this.childGroupType
            && (ti1.label === NonLabelGroupName || ti2.label === NonLabelGroupName)) {
            if (ti1.label === ti2.label) {
                return 0;
            } else {
                return ti1.label === NonLabelGroupName ? 1 : -1;
            }
        }

        return super.compareChildrenImpl(ti1, ti2);
    }

    public getPropertyValue(item: ListContainersItem, property: ContainerProperty): string {
        return getContainerPropertyValue(item, property);
    }

    protected getTreeItemForEmptyList(): AzExtTreeItem[] {
        if (this.newContainerUser) {
            const dockerTutorialTreeItem = new OpenUrlTreeItem(this, l10n.t('Tutorial: Get started with Docker'), 'https://aka.ms/getstartedwithdocker');
            dockerTutorialTreeItem.iconPath = new ThemeIcon('link-external');
            return [dockerTutorialTreeItem];
        }
        return super.getTreeItemForEmptyList();
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
