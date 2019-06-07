/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext, ImageGrouping } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from "../IconPath";
import { IImageAndTag, ImageTreeItem, sortImages } from "./ImageTreeItem";

export class ImageGroupTreeItem extends AzExtParentTreeItem {
    public static readonly contextValue: string = 'imageGroup';
    public readonly contextValue: string = ImageGroupTreeItem.contextValue;
    public childTypeLabel: string = 'image';

    private _group: string;
    private _images: IImageAndTag[];

    public constructor(parent: AzExtParentTreeItem, group: string, images: IImageAndTag[]) {
        super(parent);
        this._group = group;
        this._images = images;
    }

    public get label(): string {
        return this._group;
    }

    public get iconPath(): IconPath {
        let icon: string;
        switch (ext.groupImagesBy) {
            case ImageGrouping.Repository:
                icon = 'repository';
                break;
            default:
                icon = 'applicationGroup';
        }
        return getThemedIconPath(icon);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        return this._images.map(r => new ImageTreeItem(this, r));
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof ImageTreeItem && ti2 instanceof ImageTreeItem) {
            return sortImages(ti1, ti2);
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }
}
