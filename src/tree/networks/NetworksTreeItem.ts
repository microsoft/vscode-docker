/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkInspectInfo } from "dockerode";
import { AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AutoRefreshTreeItemBase } from "../AutoRefreshTreeItemBase";
import { NetworkTreeItem } from "./NetworkTreeItem";

export class NetworksTreeItem extends AutoRefreshTreeItemBase<NetworkInspectInfo> {
    public static contextValue: string = 'networks';
    public contextValue: string = NetworksTreeItem.contextValue;
    public label: string = 'Networks';
    public childTypeLabel: string = 'network';
    public noItemsMessage: string = "Successfully connected, but no networks found.";

    public getItemID(item: NetworkInspectInfo): string {
        return item.Id;
    }

    public async getItems(): Promise<NetworkInspectInfo[]> {
        return await ext.dockerode.listNetworks() || [];
    }

    public async  convertToTreeItems(items: NetworkInspectInfo[]): Promise<AzExtTreeItem[]> {
        return items.map(n => new NetworkTreeItem(this, n));
    }
}
