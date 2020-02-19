/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, GenericTreeItem, IGenericTreeItemOptions } from "vscode-azureextensionui";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProvider } from "./IRegistryProvider";

export class RegistryErrorTreeItem extends GenericTreeItem {
    public constructor(parent: AzExtParentTreeItem, options: IGenericTreeItemOptions, public readonly data: { cachedProvider: ICachedRegistryProvider, provider: IRegistryProvider }) {
        super(parent, options);
    }
}
