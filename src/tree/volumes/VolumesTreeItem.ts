/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { callDockerodeAsync } from "../../utils/callDockerode";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { LocalVolumeInfo } from "./LocalVolumeInfo";
import { VolumeGroupTreeItem } from "./VolumeGroupTreeItem";
import { volumeProperties, VolumeProperty } from "./VolumeProperties";
import { VolumeTreeItem } from "./VolumeTreeItem";

export class VolumesTreeItem extends LocalRootTreeItemBase<LocalVolumeInfo, VolumeProperty> {
    public treePrefix: string = 'volumes';
    public label: string = localize('vscode-docker.tree.volumes.label', 'Volumes');
    public configureExplorerTitle: string = localize('vscode-docker.tree.volumes.configure', 'Configure volumes explorer');
    public childType: LocalChildType<LocalVolumeInfo> = VolumeTreeItem;
    public childGroupType: LocalChildGroupType<LocalVolumeInfo, VolumeProperty> = VolumeGroupTreeItem;

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

    public async getItems(): Promise<LocalVolumeInfo[]> {
        const result = await callDockerodeAsync(async () => ext.dockerode.listVolumes());
        const volumes = (result && result.Volumes) || [];
        return volumes.map(v => new LocalVolumeInfo(v));
    }

    public getPropertyValue(item: LocalVolumeInfo, property: VolumeProperty): string {
        switch (property) {
            case 'VolumeName':
                return item.volumeName;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
