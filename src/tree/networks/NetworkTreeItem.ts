/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerInfo, NetworkInspectInfo } from "dockerode";
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { ContainerTreeItem } from '../containers/ContainerTreeItem';
import { getThemedIconPath, IconPath } from '../IconPath';

export class NetworkTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'network';
    public contextValue: string = NetworkTreeItem.contextValue;

    public network: NetworkInspectInfo;

    private _connectedContainers: ContainerInfo[];

    public constructor(parent: AzExtParentTreeItem, network: NetworkInspectInfo, connectedContainers: ContainerInfo[]) {
        super(parent);
        this.network = network;
        this._connectedContainers = connectedContainers;
    }

    public get label(): string {
        return this.network.Name;
    }

    public get description(): string {
        return this.network.Driver;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        return this._connectedContainers.map(r => new ContainerTreeItem(this, r));
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public get id(): string {
        return this.network.Id;
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('network');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await ext.dockerode.getNetwork(this.network.Id).remove();
    }
}
