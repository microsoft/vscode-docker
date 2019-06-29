/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { IRegistryProviderTreeItem } from "../../tree/registries/IRegistryProviderTreeItem";
import { registryExpectedContextValues } from "../../tree/registries/registryContextValues";

export async function disconnectRegistry(context: IActionContext, node?: IRegistryProviderTreeItem & AzExtTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<IRegistryProviderTreeItem & AzExtTreeItem>(registryExpectedContextValues.all.registryProvider, context);
    }

    await ext.registriesRoot.disconnectRegistry(context, node);
}
