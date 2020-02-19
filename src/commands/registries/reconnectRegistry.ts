/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { RegistryConnectErrorTreeItem } from "../../tree/registries/RegistryConnectErrorTreeItem";

export async function reconnectRegistry(context: IActionContext, node?: RegistryConnectErrorTreeItem): Promise<void> {
    if (!node?.cachedProvider || !node?.provider) {
        // TODO: error?
        return;
    }

    await ext.registriesRoot.disconnectRegistry(context, node.cachedProvider);
    await ext.registriesRoot.connectRegistry(context, node.provider);
}
