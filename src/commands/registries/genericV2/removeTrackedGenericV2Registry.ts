/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from "@microsoft/vscode-azext-utils";
import { GenericV2Registry } from "@microsoft/vscode-docker-registries";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function removeTrackedGenericV2Registry(context: IActionContext, node?: UnifiedRegistryItem<GenericV2Registry>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.genericRegistryV2DataProvider, { include: 'genericRegistryV2Registry' });
    }

    await ext.genericRegistryV2DataProvider.removeTrackedRegistry(node.wrappedItem);
    // don't wait
    void ext.registriesTree.refresh();
}
