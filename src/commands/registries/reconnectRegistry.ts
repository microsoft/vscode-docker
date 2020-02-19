/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { RegistryErrorTreeItem } from "../../tree/registries/RegistryErrorTreeItem";

export async function reconnectRegistry(context: IActionContext, node?: RegistryErrorTreeItem): Promise<void> {
    if (!node?.data?.cachedProvider || !node?.data?.provider) {
        // TODO: error?
        return;
    }

    await ext.registriesRoot.disconnectRegistry(context, node.data.cachedProvider);
    await ext.registriesRoot.connectRegistry(context, node.data.provider);
}
