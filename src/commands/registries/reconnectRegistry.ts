/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { RegistryConnectErrorTreeItem } from "../../tree/registries/RegistryConnectErrorTreeItem";

export async function reconnectRegistry(context: IActionContext, node?: RegistryConnectErrorTreeItem): Promise<void> {
    if (!node?.cachedProvider || !node?.provider) {
        // This is not expected ever, so we'll throw an error which can be bubbled up to a Report Issue if it does
        throw new Error(localize('vscode-docker.commands.registries.reconnectError', 'Unable to determine provider to re-enter credentials. Please disconnect and connect again.'));
    }

    await ext.registriesRoot.disconnectRegistry(context, node.cachedProvider);
    await ext.registriesRoot.connectRegistry(context, node.provider, node.url);
}
