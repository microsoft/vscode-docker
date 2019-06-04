/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryType } from "../RegistryType";
import { TagTreeItemBase } from "../TagTreeItemBase";
import { AzureRepositoryTreeItem } from "./AzureRepositoryTreeItem";

export class AzureTagTreeItem extends TagTreeItemBase {
    public static contextValue: string = RegistryType.azure + TagTreeItemBase.contextValueSuffix;
    public contextValue: string = AzureTagTreeItem.contextValue;
    public parent: AzureRepositoryTreeItem;

    public constructor(parent: AzureRepositoryTreeItem, tag: string, time: string) {
        super(parent, tag, time);
    }
}
