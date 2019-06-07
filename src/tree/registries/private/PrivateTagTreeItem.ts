/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryType } from "../RegistryType";
import { RemoteTagTreeItemBase } from "../RemoteTagTreeItemBase";
import { PrivateRepositoryTreeItem } from "./PrivateRepositoryTreeItem";

export class PrivateTagTreeItem extends RemoteTagTreeItemBase {
    public static contextValue: string = RegistryType.private + RemoteTagTreeItemBase.contextValueSuffix;
    public contextValue: string = PrivateTagTreeItem.contextValue;
    public parent: PrivateRepositoryTreeItem;

    public constructor(parent: PrivateRepositoryTreeItem, tag: string, time: string) {
        super(parent, tag, time);
    }
}
