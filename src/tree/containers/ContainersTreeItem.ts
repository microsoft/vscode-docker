/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, CommonSortBy, getTreeSetting, ITreeSettingInfo } from "../settings/commonTreeSettings";
import { ContainerGroupTreeItem } from "./ContainerGroupTreeItem";
import { ContainerProperty, ContainersGroupBy, ContainersSortBy, containersTreePrefix, getContainerPropertyValue } from "./containersTreeSettings";
import { ContainerTreeItem } from "./ContainerTreeItem";
import { LocalContainerInfo } from "./LocalContainerInfo";

export class ContainersTreeItem extends LocalRootTreeItemBase<LocalContainerInfo> {
    public treePrefix: string = containersTreePrefix;
    public label: string = 'Containers';
    public noItemsMessage: string = "Successfully connected, but no containers found.";
    public childType: LocalChildType<LocalContainerInfo> = ContainerTreeItem;
    public childGroupType: LocalChildGroupType<LocalContainerInfo> = ContainerGroupTreeItem;
    public sortBySettingInfo: ITreeSettingInfo<CommonSortBy> = ContainersSortBy;
    public groupBySettingInfo: ITreeSettingInfo<ContainerProperty | CommonGroupBy> = ContainersGroupBy;

    public get childTypeLabel(): string {
        const groupBy = getTreeSetting(ContainersGroupBy);
        return groupBy === 'None' ? 'container' : 'container group';
    }

    public async getItems(): Promise<LocalContainerInfo[]> {
        const options = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };

        const items = await ext.dockerode.listContainers(options) || [];
        return items.map(c => new LocalContainerInfo(c));
    }

    public getGroup(item: LocalContainerInfo): string | undefined {
        let groupBy = getTreeSetting(ContainersGroupBy);
        if (groupBy === 'None') {
            return undefined;
        } else {
            return getContainerPropertyValue(item, groupBy);
        }
    }
}
