/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { getAzActTreeItem } from "../../../utils/lazyPackages";
import { RegistryApi } from "../all/RegistryApi";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProvider } from "../IRegistryProvider";
import type { AzureAccountTreeItem } from "./AzureAccountTreeItem"; // These are only dev-time imports so don't need to be lazy

export const azureRegistryProviderId: string = 'azure';

export const azureRegistryProvider: IRegistryProvider = {
    label: "Azure",
    id: azureRegistryProviderId,
    api: RegistryApi.DockerV2,
    onlyOneAllowed: true,
    connectWizardOptions: undefined,
    treeItemFactory: async (parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider): Promise<AzureAccountTreeItem> => {
        const azActTreeItem = await getAzActTreeItem();
        return new azActTreeItem.AzureAccountTreeItem(parent, cachedProvider);
    },
    persistAuth: undefined,
    removeAuth: undefined,
};
