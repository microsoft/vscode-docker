/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryType } from "../RegistryType";
import { TagTreeItemBase } from "../TagTreeItemBase";
import { PrivateRepositoryTreeItem } from "./PrivateRepositoryTreeItem";

export class PrivateTagTreeItem extends TagTreeItemBase {
    public static contextValue: string = RegistryType.private + TagTreeItemBase.contextValueSuffix;
    public contextValue: string = PrivateTagTreeItem.contextValue;
    public parent: PrivateRepositoryTreeItem;

    public constructor(parent: PrivateRepositoryTreeItem, tag: string, time: string) {
        super(parent, tag, time);
    }
}
