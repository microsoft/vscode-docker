/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { GenericV2Registry, RegistryConnectError, isGenericV2Registry } from "@microsoft/vscode-docker-registries";
import { l10n } from 'vscode';
import { ext } from "../../extensionVariables";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function reconnectRegistry(context: IActionContext, node?: UnifiedRegistryItem<RegistryConnectError>): Promise<void> {
    if (!node?.provider || !node?.wrappedItem || !node?.parent) {
        // This is not expected ever, so we'll throw an error which can be bubbled up to a Report Issue if it does
        throw new Error(l10n.t('Unable to determine provider to re-enter credentials. Please disconnect and connect again.'));
    }

    if (isGenericV2Registry(node.parent.wrappedItem)) {
        await ext.genericRegistryV2DataProvider.removeTrackedRegistry(node.parent.wrappedItem as GenericV2Registry);
        await ext.genericRegistryV2DataProvider.addTrackedRegistry();
    } else {
        await ext.registriesTree.disconnectRegistryProvider(node.parent);
        await ext.registriesRoot.connectRegistryProvider(node.provider);
    }
}
