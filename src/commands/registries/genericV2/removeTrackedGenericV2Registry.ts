/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { GenericV2Registry } from "@microsoft/vscode-docker-registries";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../../utils/registryExperience";

export async function removeTrackedGenericV2Registry(context: IActionContext, node?: UnifiedRegistryItem<GenericV2Registry>): Promise<void> {
    if (!node) {
        node = await registryExperience<GenericV2Registry>(context, {
            contextValueFilter: { include: /commonregistry/i },
            registryFilter: { include: [ext.genericRegistryV2DataProvider.label] }
        });
    }

    await ext.genericRegistryV2DataProvider.removeTrackedRegistry(node.wrappedItem);
    // don't wait
    void ext.registriesTree.refresh();
}
