/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../localize';
import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { GitLabAccountTreeItem } from "./GitLabAccountTreeItem";

export const gitLabRegistryProvider: IRegistryProvider = {
    label: "GitLab",
    id: 'gitLab',
    api: RegistryApi.GitLabV4,
    connectWizardOptions: {
        wizardTitle: localize('vscode-docker.tree.registries.gitlab.signIn', 'Sign in to GitLab'),
        includeUsername: true,
        includePassword: true,
    },
    treeItemType: GitLabAccountTreeItem
}
