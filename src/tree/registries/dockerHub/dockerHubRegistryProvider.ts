/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryApi } from "../all/RegistryApi";
import { IRegistryProvider } from "../IRegistryProvider";
import { DockerHubAccountTreeItem } from "./DockerHubAccountTreeItem";

export const dockerHubRegistryProviderId: string = 'dockerHub';

export const dockerHubRegistryProvider: IRegistryProvider = {
    label: "Docker Hub",
    id: dockerHubRegistryProviderId,
    api: RegistryApi.DockerHubV2,
    logInOptions: {
        wizardTitle: 'Log In to Docker Hub',
        includeUsername: true,
        usernamePrompt: 'Enter your Docker ID',
        includePassword: true,
    },
    treeItemType: DockerHubAccountTreeItem
}
