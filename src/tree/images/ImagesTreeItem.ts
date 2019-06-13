/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from "../../extensionVariables";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, CommonSortBy, getTreeSetting, ITreeSettingInfo } from "../settings/commonTreeSettings";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { getImagePropertyValue, ImageProperty, ImagesGroupBy, ImagesSortBy, imagesTreePrefix } from "./imagesTreeSettings";
import { ImageTreeItem } from "./ImageTreeItem";
import { ILocalImageInfo, LocalImageInfo } from "./LocalImageInfo";

export class ImagesTreeItem extends LocalRootTreeItemBase<ILocalImageInfo> {
    public treePrefix: string = imagesTreePrefix;
    public label: string = 'Images';
    public noItemsMessage: string = "Successfully connected, but no images found.";
    public childType: LocalChildType<ILocalImageInfo> = ImageTreeItem;
    public childGroupType: LocalChildGroupType<ILocalImageInfo> = ImageGroupTreeItem;
    public sortBySettingInfo: ITreeSettingInfo<CommonSortBy> = ImagesSortBy;
    public groupBySettingInfo: ITreeSettingInfo<ImageProperty | CommonGroupBy> = ImagesGroupBy;

    public get childTypeLabel(): string {
        const groupBy = getTreeSetting(ImagesGroupBy);
        return groupBy === 'None' ? 'image' : 'image group';
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

    public getGroup(item: ILocalImageInfo): string | undefined {
        let groupBy = getTreeSetting(ImagesGroupBy);
        if (groupBy === 'None') {
            return undefined;
        } else {
            return getImagePropertyValue(item, groupBy);
        }
    }
}
