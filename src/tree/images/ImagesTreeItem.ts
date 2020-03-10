/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageInfo } from "dockerode";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { callDockerodeAsync } from "../../utils/callDockerode";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { getImagePropertyValue, imageProperties, ImageProperty } from "./ImageProperties";
import { ImageTreeItem } from "./ImageTreeItem";
import { ILocalImageInfo, LocalImageInfo } from "./LocalImageInfo";

export class ImagesTreeItem extends LocalRootTreeItemBase<ILocalImageInfo, ImageProperty> {
    public treePrefix: string = 'images';
    public label: string = localize('vscode-docker.tree.images.label', 'Images');
    public configureExplorerTitle: string = localize('vscode-docker.tree.images.configure', 'Configure images explorer');

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

        const images = await callDockerodeAsync(async () => ext.dockerode.listImages(options)) || [];
        let result: ILocalImageInfo[] = [];
        for (const image of images) {
            if (!image.RepoTags) {
                result.push(new LocalImageInfo(image, getFullTagFromDigest(image)));
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

function getFullTagFromDigest(image: ImageInfo): string {
    let repo = '<none>';
    let tag = '<none>';

    const digest = image.RepoDigests[0];
    if (digest) {
        const index = digest.indexOf('@');
        if (index > 0) {
            repo = digest.substring(0, index);
        }
    }

    return `${repo}:${tag}`;
}
