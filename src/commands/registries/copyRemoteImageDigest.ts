/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from "@microsoft/vscode-azext-utils";
import { CommonRegistryDataProvider, CommonTag } from "@microsoft/vscode-docker-registries";
import * as vscode from "vscode";
import { ext } from "../../extensionVariables";
import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function copyRemoteImageDigest(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: ['registryV2Tag'] });
    }

    const v2DataProvider = node.provider as unknown as CommonRegistryDataProvider;
    const digest = await v2DataProvider.getImageDigest?.(node.wrappedItem as CommonTag);

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.clipboard.writeText(digest);
}
