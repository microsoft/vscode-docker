/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../../extensionVariables";
import { UnifiedRegistryItem } from "../../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function addTrackedGenericV2Registry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    await ext.genericRegistryV2DataProvider.addTrackedRegistry();
    // don't wait
    void ext.registriesTree.refresh();
}
