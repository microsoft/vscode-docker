/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { CommonRegistry } from "@microsoft/vscode-docker-registries";
import { ext } from "../../extensionVariables";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";
import { registryExperience } from "../../utils/registryExperience";

export async function disconnectRegistry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    if (!node) {
        node = await registryExperience<CommonRegistry>(context, { registryFilter: { exclude: [ext.genericRegistryV2DataProvider.label] } });
    }

    await ext.registriesTree.disconnectRegistryProvider(node);
}
