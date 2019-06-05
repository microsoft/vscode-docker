/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerDesc } from "dockerode";
import { AzExtTreeItem } from "vscode-azureextensionui";
import { docker, ListContainerDescOptions } from "../utils/docker-endpoint";
import { AutoRefreshTreeItemBase } from "./AutoRefreshTreeItemBase";
import { ContainerTreeItem } from "./ContainerTreeItem";

export class ContainersTreeItem extends AutoRefreshTreeItemBase<ContainerDesc> {
    public static contextValue: string = 'containers';
    public contextValue: string = ContainersTreeItem.contextValue;
    public label: string = 'Containers';
    public childTypeLabel: string = 'container';
    public noItemsMessage: string = "Successfully connected, but no containers found.";

    public getItemID(item: ContainerDesc): string {
        return item.Id + item.State;
    }

    public async getItems(): Promise<ContainerDesc[]> {
        const options: ListContainerDescOptions = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };

        return await docker.getContainerDescriptors(options) || [];
    }

    public async  convertToTreeItems(items: ContainerDesc[]): Promise<AzExtTreeItem[]> {
        return items.map(c => new ContainerTreeItem(this, c));
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof ContainerTreeItem && ti2 instanceof ContainerTreeItem) {
            // tslint:disable-next-line: no-unsafe-any no-any
            return (<any>ti2.container).Created - (<any>ti1.container).Created;
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }
}
