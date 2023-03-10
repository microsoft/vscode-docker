/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getImageGroupIcon, ImageProperty } from "./ImageProperties";
import { DatedDockerImage } from "./ImagesTreeItem";

export class ImageGroupTreeItem extends LocalGroupTreeItemBase<DatedDockerImage, ImageProperty> {
    public static readonly contextValue: string = 'imageGroup';
    public readonly contextValue: string = ImageGroupTreeItem.contextValue;
    public childTypeLabel: string = 'image';

    public get iconPath(): ThemeIcon {
        return getImageGroupIcon(this.parent.groupBySetting);
    }

    getImages(): AzExtTreeItem[] | undefined {
        const items: AzExtTreeItem[] = super.ChildTreeItems;
        if (!items || items.length === 0) {
            return undefined;
        }
        return items;
    }
}
