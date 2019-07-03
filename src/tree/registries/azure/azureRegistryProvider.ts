/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { AzureAccountTreeItem } from "./AzureAccountTreeItem";

export const azureRegistryProviderId: string = 'azure';

export const azureRegistryProvider: IRegistryProvider = {
    label: "Azure",
    id: azureRegistryProviderId,
    api: RegistryApi.DockerV2,
    onlyOneAllowed: true,
    connectWizardOptions: undefined,
    treeItemType: AzureAccountTreeItem
}
