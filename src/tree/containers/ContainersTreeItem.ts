/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInfo } from "dockerode";
import { AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AutoRefreshTreeItemBase } from "../AutoRefreshTreeItemBase";
import { ContainerTreeItem } from "./ContainerTreeItem";

export class ContainersTreeItem extends AutoRefreshTreeItemBase<ContainerInfo> {
    public static contextValue: string = 'containers';
    public contextValue: string = ContainersTreeItem.contextValue;
    public label: string = 'Containers';
    public childTypeLabel: string = 'container';
    public noItemsMessage: string = "Successfully connected, but no containers found.";

    public getItemID(item: ContainerInfo): string {
        return item.Id + item.State;
    }

    public async getItems(): Promise<ContainerInfo[]> {
        const options = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };

        return await ext.dockerode.listContainers(options) || [];
    }

    public async  convertToTreeItems(items: ContainerInfo[]): Promise<AzExtTreeItem[]> {
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
