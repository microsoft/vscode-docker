/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { V2Registry } from "@microsoft/vscode-docker-registries";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../../utils/registryExperience";

export async function removeTrackedGenericV2Registry(context: IActionContext, node?: UnifiedRegistryItem<V2Registry>): Promise<void> {
    if (!node) {
        node = await registryExperience<V2Registry>(context, {
            registryFilter: { include: [ext.genericRegistryV2DataProvider.label] },
            contextValueFilter: { include: /commonregistry/i },
        });
    }

    await ext.genericRegistryV2DataProvider.removeTrackedRegistry(node.wrappedItem);

    // remove the provider if it's the last one
    if (!ext.genericRegistryV2DataProvider.hasTrackedRegistries()) {
        await ext.registriesTree.disconnectRegistryProvider(node.parent);
    }

    // don't wait
    void ext.registriesTree.refresh();
}
