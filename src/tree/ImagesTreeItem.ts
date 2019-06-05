/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from "vscode-azureextensionui";
import { ext, ImageGrouping } from "../extensionVariables";
import { docker } from "../utils/docker-endpoint";
import { AutoRefreshTreeItemBase } from "./AutoRefreshTreeItemBase";
import { getImageLabel } from "./getImageLabel";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { IImageAndTag, ImageTreeItem, sortImages } from "./ImageTreeItem";

export class ImagesTreeItem extends AutoRefreshTreeItemBase<IImageAndTag> {
    public static contextValue: string = ImagesTreeItem.contextValue;
    public contextValue: string = 'images';
    public label: string = 'Images';
    public noItemsMessage: string = "Successfully connected, but no images found.";

    public get childTypeLabel(): string {
        switch (ext.groupImagesBy) {
            case ImageGrouping.ImageId:
                return 'image id';
            case ImageGrouping.Repository:
                return 'repository';
            case ImageGrouping.RepositoryName:
                return 'repository name';
            default:
                return 'image';
        }
    }

    public getItemID(item: IImageAndTag): string {
        return item.image.Id + item.fullTag;
    }

    public async getItems(): Promise<IImageAndTag[]> {
        const options = {
            "filters": {
                "dangling": ["false"]
            }
        };

        const images = await docker.getImageDescriptors(options) || [];
        let result: IImageAndTag[] = [];
        for (const image of images) {
            if (!image.RepoTags) {
                result.push({ image, fullTag: '<none>:<none>' });
            } else {
                for (let fullTag of image.RepoTags) {
                    result.push({ image, fullTag });
                }
            }
        }
        return result;
    }

    public async convertToTreeItems(items: IImageAndTag[]): Promise<AzExtTreeItem[]> {
        const groupMap = new Map<string | undefined, IImageAndTag[]>();
        for (const item of items) {
            let groupTemplate: string | undefined;
            switch (ext.groupImagesBy) {
                case ImageGrouping.ImageId:
                    groupTemplate = '{shortImageId}';
                    break;
                case ImageGrouping.Repository:
                    groupTemplate = '{repository}';
                    break;
                case ImageGrouping.RepositoryName:
                    groupTemplate = '{repositoryName}';
                    break;
                default:
            }

            const group: string | undefined = groupTemplate ? getImageLabel(item.fullTag, item.image, groupTemplate) : undefined;
            const tags = groupMap.get(group);
            if (tags) {
                tags.push(item);
            } else {
                groupMap.set(group, [item]);
            }
        }

        const result: AzExtTreeItem[] = [];
        for (const [group, groupedItems] of groupMap.entries()) {
            if (!group) {
                result.push(...groupedItems.map(r => new ImageTreeItem(this, r)));
            } else {
                result.push(new ImageGroupTreeItem(this, group, groupedItems));
            }
        }

        return result;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof ImageTreeItem && ti2 instanceof ImageTreeItem) {
            return sortImages(ti1, ti2);
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }
}
