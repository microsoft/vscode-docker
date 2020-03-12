/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "vscode-azureextensionui";
import { RegistryApi } from "../all/RegistryApi";
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProvider } from "../IRegistryProvider";
import { AzureAccountTreeItem } from "./AzureAccountTreeItem";

export const azureRegistryProviderId: string = 'azure';

export const azureRegistryProvider: IRegistryProvider = {
    label: "Azure",
    id: azureRegistryProviderId,
    api: RegistryApi.DockerV2,
    onlyOneAllowed: true,
    connectWizardOptions: undefined,
    treeItemFactory: (parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider) => new AzureAccountTreeItem(parent, cachedProvider),
    persistAuth: undefined,
    removeAuth: undefined,
}
