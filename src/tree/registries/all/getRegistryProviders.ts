/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { azureRegistryProvider } from "../azure/azureRegistryProvider";
import { dockerHubRegistryProvider } from "../dockerHub/dockerHubRegistryProvider";
import { genericDockerV2RegistryProvider } from "../dockerV2/genericDockerV2RegistryProvider";
import { gitLabRegistryProvider } from "../gitLab/gitLabRegistryProvider";
import { IRegistryProvider } from "../IRegistryProvider";

const providers: IRegistryProvider[] = [
    azureRegistryProvider,
    dockerHubRegistryProvider,
    gitLabRegistryProvider,
    genericDockerV2RegistryProvider
];

export function getRegistryProviders(): IRegistryProvider[] {
    return providers;
}

export function getRegistryProvider(providerId: string): IRegistryProvider {
    return providers.find((provider) => provider.id === providerId);
}
