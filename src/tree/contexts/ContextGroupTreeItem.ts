/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListContextItem } from "../../runtimes/docker";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { ContextProperty } from "./ContextProperties";

export class ContextGroupTreeItem extends LocalGroupTreeItemBase<ListContextItem, ContextProperty> {
    public static readonly contextValue: string = 'contextGroup';
    public readonly contextValue: string = ContextGroupTreeItem.contextValue;
    public childTypeLabel: string = 'context';
}
