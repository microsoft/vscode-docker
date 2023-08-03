/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";


export async function disconnectRegistry(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    await node.provider.onDisconnect?.();
}
