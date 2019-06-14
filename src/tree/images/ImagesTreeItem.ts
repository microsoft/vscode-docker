/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { getImagePropertyValue, imageProperties, ImageProperty } from "./ImageProperties";
import { ImageTreeItem } from "./ImageTreeItem";
import { ILocalImageInfo, LocalImageInfo } from "./LocalImageInfo";

export class ImagesTreeItem extends LocalRootTreeItemBase<ILocalImageInfo, ImageProperty> {
    public treePrefix: string = 'images';
    public label: string = 'Images';
    public configureExplorerTitle: string = 'Configure images explorer';

    public childType: LocalChildType<ILocalImageInfo> = ImageTreeItem;
    public childGroupType: LocalChildGroupType<ILocalImageInfo, ImageProperty> = ImageGroupTreeItem;

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

    public async getItems(): Promise<ILocalImageInfo[]> {
        const options = {
            "filters": {
                "dangling": ["false"]
            }
        };

        const images = await ext.dockerode.listImages(options) || [];
        let result: ILocalImageInfo[] = [];
        for (const image of images) {
            if (!image.RepoTags) {
                result.push(new LocalImageInfo(image, '<none>:<none>'));
            } else {
                for (let fullTag of image.RepoTags) {
                    result.push(new LocalImageInfo(image, fullTag));
                }
            }
        }

        return result;
    }

    public getPropertyValue(item: ILocalImageInfo, property: ImageProperty): string {
        return getImagePropertyValue(item, property);
    }
}
