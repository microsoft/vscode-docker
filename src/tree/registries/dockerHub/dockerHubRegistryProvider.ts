/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n } from 'vscode';
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
        wizardTitle: l10n.t('Sign in to Docker Hub'),
        includeUsername: true,
        usernamePrompt: l10n.t('Visit hub.docker.com to sign up for a Docker ID'),
        usernamePlaceholder: l10n.t('Enter your Docker ID'),
        passwordPrompt: l10n.t('Enter your password or personal access token'),
        includePassword: true,
    },
    treeItemFactory: (parent, cachedProvider) => new DockerHubAccountTreeItem(parent, cachedProvider),
    persistAuth: async (cachedProvider, secret) => await setRegistryPassword(cachedProvider, secret),
    removeAuth: async (cachedProvider) => await deleteRegistryPassword(cachedProvider),
};
