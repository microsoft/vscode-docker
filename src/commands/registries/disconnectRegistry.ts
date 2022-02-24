/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, InvalidTreeItem } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { ICachedRegistryProvider } from "../../tree/registries/ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../../tree/registries/IRegistryProviderTreeItem";

export async function disconnectRegistry(context: IActionContext, node?: InvalidTreeItem | IRegistryProviderTreeItem): Promise<void> {
    let cachedProvider: ICachedRegistryProvider | undefined;
    if (node instanceof InvalidTreeItem) {
        cachedProvider = <ICachedRegistryProvider>node.data;
    } else if (node) {
        cachedProvider = node.cachedProvider;
    }
    await ext.registriesRoot.disconnectRegistry(context, cachedProvider);
}
