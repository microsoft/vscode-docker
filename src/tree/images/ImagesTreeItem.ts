/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { danglingImagesMementoKey } from "../../commands/images/showDanglingImages";
import { ext } from "../../extensionVariables";
import { ListImagesCommandOptions, ListImagesItem } from "../../runtimes/docker";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { TreePrefix } from "../TreePrefix";
import { OutdatedImageChecker } from "./imageChecker/OutdatedImageChecker";
import { ImageGroupTreeItem } from './ImageGroupTreeItem';
import { getImagePropertyValue, imageProperties, ImageProperty } from "./ImageProperties";
import { ImageTreeItem } from "./ImageTreeItem";

export interface DatedDockerImage extends ListImagesItem {
    outdated?: boolean;
}

export class ImagesTreeItem extends LocalRootTreeItemBase<DatedDockerImage, ImageProperty> {
    private readonly outdatedImageChecker: OutdatedImageChecker = new OutdatedImageChecker();

    public constructor(parent?: AzExtParentTreeItem) {
        super(parent);
        this.sortBySettingInfo.properties.push({
            property: 'Size',
            description: l10n.t('Sort by image size')
        });
    }

    public treePrefix: TreePrefix = 'images';
    public label: string = l10n.t('Images');
    public configureExplorerTitle: string = l10n.t('Configure images explorer');

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
        // No grouping by size
        properties: [...imageProperties.filter(p => p.property !== 'Size'), groupByNoneProperty],
        defaultProperty: 'Repository',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'image' : 'image group';
    }

    public async getItems(context: IActionContext): Promise<DatedDockerImage[]> {
        const includeDangling = ext.context.globalState.get(danglingImagesMementoKey, false);
        const options: ListImagesCommandOptions = {
            // Dangling images are included by default, so if `includeDangling` is true, use `dangling` option `undefined`
            // If `includeDangling` is false, explicitly exclude the images using `dangling` option `false`
            dangling: includeDangling ? undefined : false,
        };

        const result = await ext.runWithDefaults(client =>
            client.listImages(options)
        );
        this.outdatedImageChecker.markOutdatedImages(result);

        return result;
    }

    public getPropertyValue(item: ListImagesItem, property: ImageProperty): string {
        return getImagePropertyValue(item, property);
    }
}
