/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { DockerImage } from "../../docker/Images";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { getImagePropertyValue, imageProperties, ImageProperty } from "./ImageProperties";
import { ImageTreeItem } from "./ImageTreeItem";
import { OutdatedImageChecker } from "./OutdatedImageChecker";

export interface DatedDockerImage extends DockerImage {
    Outdated?: boolean;
}

export class ImagesTreeItem extends LocalRootTreeItemBase<DatedDockerImage, ImageProperty> {
    private readonly outdatedImageChecker: OutdatedImageChecker = new OutdatedImageChecker();

    public treePrefix: string = 'images';
    public label: string = localize('vscode-docker.tree.images.label', 'Images');
    public configureExplorerTitle: string = localize('vscode-docker.tree.images.configure', 'Configure images explorer');

    public childType: LocalChildType<DatedDockerImage> = ImageTreeItem;
    public childGroupType: LocalChildGroupType<DatedDockerImage, ImageProperty> = ImageGroupTreeItem;

    public labelSettingInfo: ITreeSettingInfo<ImageProperty> = {
        properties: imageProperties,
        defaultProperty: 'Tag',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<ImageProperty> = {
        properties: imageProperties,
        defaultProperty: ['CreatedTime'],
    };

    public groupBySettingInfo: ITreeSettingInfo<ImageProperty | CommonGroupBy> = {
        properties: [...imageProperties, groupByNoneProperty],
        defaultProperty: 'Repository',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'image' : 'image group';
    }

    public async getItems(context: IActionContext): Promise<DatedDockerImage[]> {
        const result = await ext.dockerClient.getImages(context);
        this.outdatedImageChecker.markOutdatedImages(result);
        return result;
    }

    public getPropertyValue(item: DockerImage, property: ImageProperty): string {
        return getImagePropertyValue(item, property);
    }
}
