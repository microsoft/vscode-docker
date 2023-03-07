/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { ListVolumeItem } from "../../runtimes/docker";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { TreePrefix } from "../TreePrefix";
import { VolumeGroupTreeItem } from "./VolumeGroupTreeItem";
import { volumeProperties, VolumeProperty } from "./VolumeProperties";
import { VolumeTreeItem } from "./VolumeTreeItem";

export class VolumesTreeItem extends LocalRootTreeItemBase<ListVolumeItem, VolumeProperty> {
    public treePrefix: TreePrefix = 'volumes';
    public label: string = l10n.t('Volumes');
    public configureExplorerTitle: string = l10n.t('Configure volumes explorer');
    public childType: LocalChildType<ListVolumeItem> = VolumeTreeItem;
    public childGroupType: LocalChildGroupType<ListVolumeItem, VolumeProperty> = VolumeGroupTreeItem;

    public labelSettingInfo: ITreeSettingInfo<VolumeProperty> = {
        properties: volumeProperties,
        defaultProperty: 'VolumeName',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<VolumeProperty> = {
        properties: volumeProperties,
        defaultProperty: ['CreatedTime'],
    };

    public groupBySettingInfo: ITreeSettingInfo<VolumeProperty | CommonGroupBy> = {
        properties: [...volumeProperties, groupByNoneProperty],
        defaultProperty: 'None',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'volume' : 'volume group';
    }

    public async getItems(context: IActionContext): Promise<ListVolumeItem[]> {
        return ext.runWithDefaults(client =>
            client.listVolumes({})
        );
    }

    public getPropertyValue(item: ListVolumeItem, property: VolumeProperty): string {
        switch (property) {
            case 'VolumeName':
                return item.name;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
