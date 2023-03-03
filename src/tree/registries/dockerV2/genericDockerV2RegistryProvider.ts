/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n } from 'vscode';
import { RegistryApi } from "../all/RegistryApi";
import { basicOAuthProvider } from '../auth/BasicOAuthProvider';
import { IRegistryProvider } from "../IRegistryProvider";
import { deleteRegistryPassword, setRegistryPassword } from '../registryPasswords';
import { GenericDockerV2RegistryTreeItem } from "./GenericDockerV2RegistryTreeItem";

export const genericDockerV2RegistryProvider: IRegistryProvider = {
    label: l10n.t('Generic Docker Registry'),
    description: l10n.t('(Preview)'),
    detail: l10n.t('Connect any generic private registry that supports the "Docker V2" api.'),
    id: 'genericDockerV2',
    api: RegistryApi.DockerV2,
    isSingleRegistry: true,
    connectWizardOptions: {
        wizardTitle: l10n.t('Connect Docker Registry'),
        includeUrl: true,
        urlPrompt: l10n.t('Enter the URL for the registry'),
        includeUsername: true,
        isUsernameOptional: true,
        includePassword: true,
    },
    treeItemFactory: (parent, cachedProvider) => new GenericDockerV2RegistryTreeItem(parent, cachedProvider, basicOAuthProvider),
    persistAuth: async (cachedProvider, secret) => await setRegistryPassword(cachedProvider, secret),
    removeAuth: async (cachedProvider) => await deleteRegistryPassword(cachedProvider),
};
