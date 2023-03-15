/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getImageGroupIcon, ImageProperty } from "./ImageProperties";
import { DatedDockerImage } from "./ImagesTreeItem";

export class ImageGroupTreeItem extends LocalGroupTreeItemBase<DatedDockerImage, ImageProperty> {
    public static readonly contextValue: string = 'imageGroup';
    public readonly canMultiSelect: boolean = true;
    public readonly contextValue: string = ImageGroupTreeItem.contextValue;
    public childTypeLabel: string = 'image';

    public get iconPath(): ThemeIcon {
        return getImageGroupIcon(this.parent.groupBySetting);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        this.ChildTreeItems.forEach(async i => await i.deleteTreeItem(context));
    }
}
