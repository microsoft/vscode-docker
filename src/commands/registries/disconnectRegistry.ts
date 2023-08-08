/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function disconnectRegistry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: 'commonregistryroot', exclude: 'genericRegistryV2Root' });
    }

    await ext.registriesTree.disconnectRegistryProvider(node);
}
