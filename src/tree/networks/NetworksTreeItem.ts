/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInfo, NetworkInspectInfo } from "dockerode";
import { AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AutoRefreshTreeItemBase } from "../AutoRefreshTreeItemBase";
import { NetworkTreeItem } from "./NetworkTreeItem";

export class NetworksTreeItem extends AutoRefreshTreeItemBase<NetworkInspectInfo> {
    public static contextValue: string = 'networks';
    public contextValue: string = NetworksTreeItem.contextValue;
    public label: string = 'Networks';
    public childTypeLabel: string = 'network';
    public noItemsMessage: string = "No networks found.";

    public getItemID(item: NetworkInspectInfo): string {
        return item.Id;
    }

    public async getItems(): Promise<NetworkInspectInfo[]> {
        return await ext.dockerode.listNetworks() || [];
    }

    public async  convertToTreeItems(items: NetworkInspectInfo[]): Promise<AzExtTreeItem[]> {
        let allContainers = await ext.dockerode.listContainers();
        return items.map(n => {
            let connectedContainers = this.containerNetworkFilter(allContainers, n.Id);
            return new NetworkTreeItem(this, n, connectedContainers);
        });
    }

    private containerNetworkFilter(containers: ContainerInfo[], networkID: string): ContainerInfo[] {
        return containers.filter(container => {
            let networks = Object.values(container.NetworkSettings.Networks);
            return networks.some(network => network.NetworkID === networkID);
        });
    }
}
