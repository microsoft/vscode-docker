/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../localize';
import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { GenericDockerV2RegistryTreeItem } from "./GenericDockerV2RegistryTreeItem";

export const genericDockerV2RegistryProvider: IRegistryProvider = {
    label: localize('vscode-docker.tree.registries.v2.label', 'Generic Docker Registry'),
    description: localize('vscode-docker.tree.registries.v2.description', '(Preview)'),
    detail: localize('vscode-docker.tree.registries.v2.detail', 'Connect any generic private registry that supports the "Docker V2" api.'),
    id: 'genericDockerV2',
    api: RegistryApi.DockerV2,
    isSingleRegistry: true,
    connectWizardOptions: {
        wizardTitle: localize('vscode-docker.tree.registries.v2.title', 'Connect Docker Registry'),
        includeUrl: true,
        urlPrompt: localize('vscode-docker.tree.registries.v2.urlPrompt', 'Enter the URL for the registry (OAuth not yet supported)'),
        includeUsername: true,
        isUsernameOptional: true,
        includePassword: true,
    },
    treeItemType: GenericDockerV2RegistryTreeItem
}
