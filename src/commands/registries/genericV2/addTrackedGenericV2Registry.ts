/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function addTrackedGenericV2Registry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    const root = ext.genericRegistryV2DataProvider.getRoot();
    const registries = await ext.genericRegistryV2DataProvider.getRegistries(root);

    if (registries?.length > 0) {
        // if there are already registries, add a new registry to the existing root node
        await ext.genericRegistryV2DataProvider.addTrackedRegistry();
    } else {
        // if there are no registries, connect as usual
        await ext.registriesTree.connectRegistryProvider(ext.genericRegistryV2DataProvider);
    }

    // don't wait
    void ext.registriesTree.refresh();
}
