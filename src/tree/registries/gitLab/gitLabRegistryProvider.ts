/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n } from 'vscode';
import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { deleteRegistryPassword, setRegistryPassword } from '../registryPasswords';
import { GitLabAccountTreeItem } from "./GitLabAccountTreeItem";

export const gitLabRegistryProvider: IRegistryProvider = {
    label: "GitLab",
    id: 'gitLab',
    api: RegistryApi.GitLabV4,
    connectWizardOptions: {
        wizardTitle: l10n.t('Sign in to GitLab'),
        includeUsername: true,
        includePassword: true,
        passwordPrompt: l10n.t('GitLab Personal Access Token (requires `api` or `read_api` scope)'),
    },
    treeItemFactory: (parent, cachedProvider) => new GitLabAccountTreeItem(parent, cachedProvider),
    persistAuth: async (cachedProvider, secret) => await setRegistryPassword(cachedProvider, secret),
    removeAuth: async (cachedProvider) => await deleteRegistryPassword(cachedProvider),
};
