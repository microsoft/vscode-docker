/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image } from 'dockerode';
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { getThemedIconPath, IconPath } from '../IconPath';
import { getTreeArraySetting, getTreeSetting } from '../settings/commonTreeSettings';
import { getImagePropertyValue, ImageDescription, ImageLabel } from './imagesTreeSettings';
import { ILocalImageInfo } from './LocalImageInfo';

export class ImageTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'image';
    public contextValue: string = ImageTreeItem.contextValue;
    private readonly _item: ILocalImageInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: ILocalImageInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get imageId(): string {
        return this._item.imageId;
    }

    public get fullTag(): string {
        return this._item.fullTag;
    }

    public get label(): string {
        const prop = getTreeSetting(ImageLabel);
        return getImagePropertyValue(this._item, prop);
    }

    public get description(): string | undefined {
        const props = getTreeArraySetting(ImageDescription);
        const values: string[] = props.map(prop => getImagePropertyValue(this._item, prop));
        return values.join(' - ');
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('application');
    }

    public getImage(): Image {
        return ext.dockerode.getImage(this.imageId);
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await this.getImage().remove({ force: true });
    }
}
