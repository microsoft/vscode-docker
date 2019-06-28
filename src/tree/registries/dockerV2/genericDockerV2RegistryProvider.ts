/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { GenericDockerV2RegistryTreeItem } from "./GenericDockerV2RegistryTreeItem";

export const genericDockerV2RegistryProvider: IRegistryProvider = {
    label: "Generic Docker Registry",
    description: '(Preview)',
    detail: 'Connect any generic private registry that supports the "Docker V2" api.',
    id: 'genericDockerV2',
    api: RegistryApi.DockerV2,
    isSingleRegistry: true,
    logInOptions: {
        wizardTitle: 'Connect Docker Registry',
        includeUrl: true,
        urlPrompt: 'Enter the URL for the registry (OAuth not yet supported)',
        includeUsername: true,
        isUsernameOptional: true,
        includePassword: true,
    },
    treeItemType: GenericDockerV2RegistryTreeItem
}
