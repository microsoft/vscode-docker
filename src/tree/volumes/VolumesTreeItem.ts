/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { DockerVolume } from "../../docker/Volumes";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { VolumeGroupTreeItem } from "./VolumeGroupTreeItem";
import { VolumeProperty, volumeProperties } from "./VolumeProperties";
import { VolumeTreeItem } from "./VolumeTreeItem";

export class VolumesTreeItem extends LocalRootTreeItemBase<DockerVolume, VolumeProperty> {
    public treePrefix: string = 'volumes';
    public label: string = localize('vscode-docker.tree.volumes.label', 'Volumes');
    public configureExplorerTitle: string = localize('vscode-docker.tree.volumes.configure', 'Configure volumes explorer');
    public childType: LocalChildType<DockerVolume> = VolumeTreeItem;
    public childGroupType: LocalChildGroupType<DockerVolume, VolumeProperty> = VolumeGroupTreeItem;

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

    public async getItems(context: IActionContext): Promise<DockerVolume[]> {
        return ext.dockerClient.getVolumes(context);
    }

    public getPropertyValue(item: DockerVolume, property: VolumeProperty): string {
        switch (property) {
            case 'VolumeName':
                return item.Name;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
