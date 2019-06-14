/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkInspectInfo } from "dockerode";
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from '../IconPath';

export class NetworkTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'network';
    public contextValue: string = NetworkTreeItem.contextValue;

    public network: NetworkInspectInfo;

    public constructor(parent: AzExtParentTreeItem, network: NetworkInspectInfo) {
        super(parent);
        this.network = network;
    }

    public get label(): string {
        return this.network.Name;
    }

    public get description(): string {
        return this.network.Driver;
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
