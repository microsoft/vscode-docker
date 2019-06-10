/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VolumeInspectInfo } from "dockerode";
import { AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AutoRefreshTreeItemBase } from "../AutoRefreshTreeItemBase";
import { VolumeTreeItem } from "./VolumeTreeItem";

export class VolumesTreeItem extends AutoRefreshTreeItemBase<VolumeInspectInfo> {
    public static contextValue: string = 'volumes';
    public contextValue: string = VolumesTreeItem.contextValue;
    public label: string = 'Volumes';
    public childTypeLabel: string = 'volume';
    public noItemsMessage: string = "Successfully connected, but no volumes found.";

    public getItemID(item: VolumeInspectInfo): string {
        return item.Name;
    }

    public async getItems(): Promise<VolumeInspectInfo[]> {
        const result = await ext.dockerode.listVolumes();
        return (result && result.Volumes) || [];
    }

    public async  convertToTreeItems(items: VolumeInspectInfo[]): Promise<AzExtTreeItem[]> {
        return items.map(v => new VolumeTreeItem(this, v));
    }
}
