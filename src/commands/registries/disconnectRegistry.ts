/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { IRegistryProviderTreeItem } from "../../tree/registries/IRegistryProviderTreeItem";

export async function disconnectRegistry(context: IActionContext, node?: IRegistryProviderTreeItem & AzExtTreeItem): Promise<void> {
    await ext.registriesRoot.disconnectRegistry(context, node && node.cachedProvider);
}
