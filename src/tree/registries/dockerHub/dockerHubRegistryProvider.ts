/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../localize';
import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { deleteRegistryPassword, setRegistryPassword } from '../registryPasswords';
import { DockerHubAccountTreeItem } from "./DockerHubAccountTreeItem";

export const dockerHubRegistryProviderId: string = 'dockerHub';

export const dockerHubRegistryProvider: IRegistryProvider = {
    label: "Docker Hub",
    id: dockerHubRegistryProviderId,
    api: RegistryApi.DockerHubV2,
    connectWizardOptions: {
        wizardTitle: localize('vscode-docker.tree.registries.dockerHub.signIn', 'Sign in to Docker Hub'),
        includeUsername: true,
        usernamePrompt: localize('vscode-docker.tree.registries.dockerHub.enterID', 'Enter your Docker ID'),
        includePassword: true,
    },
    treeItemFactory: (parent, cachedProvider) => new DockerHubAccountTreeItem(parent, cachedProvider),
    persistAuth: async (cachedProvider, secret) => await setRegistryPassword(cachedProvider, secret),
    removeAuth: async (cachedProvider) => await deleteRegistryPassword(cachedProvider),
}
