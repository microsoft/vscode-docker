/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../localize';
import { RegistryApi } from "../all/RegistryApi";
import { basicOAuthProvider } from '../auth/BasicOAuthProvider';
import { CloudsmithRegistryTreeItem } from "../cloudsmith/CloudsmithRegistryTreeItem";
import { IRegistryProvider } from "../IRegistryProvider";
import { deleteRegistryPassword, setRegistryPassword } from '../registryPasswords';

export const cloudsmithRegistryProviderId: string = 'cloudsmith';

export const cloudsmithRegistryProvider: IRegistryProvider = {
    label: 'Cloudsmith',
    id: cloudsmithRegistryProviderId,
    api: RegistryApi.DockerV2,
    isSingleRegistry: true,
    connectWizardOptions: {
        wizardTitle: localize('vscode-docker.tree.registries.cloudsmith.signIn', 'Connect Cloudsmith Docker Registry'),
        includeUrl: true,
        urlPrompt: localize('vscode-docker.tree.registries.v2.urlPrompt', 'Enter the URL for the registry'),
        includeUsername: true,
        includePassword: true,
    },
    treeItemFactory: (parent, cachedProvider) => new CloudsmithRegistryTreeItem(parent, cachedProvider, basicOAuthProvider),
    persistAuth: async (cachedProvider, secret) => await setRegistryPassword(cachedProvider, secret),
    removeAuth: async (cachedProvider) => await deleteRegistryPassword(cachedProvider),
}
