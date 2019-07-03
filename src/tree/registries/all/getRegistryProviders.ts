/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { azureRegistryProvider } from "../azure/azureRegistryProvider";
import { dockerHubRegistryProvider } from "../dockerHub/dockerHubRegistryProvider";
import { genericDockerV2RegistryProvider } from "../dockerV2/genericDockerV2RegistryProvider";
import { IRegistryProvider } from "../IRegistryProvider";

export function getRegistryProviders(): IRegistryProvider[] {
    return [
        azureRegistryProvider,
        dockerHubRegistryProvider,
        genericDockerV2RegistryProvider
    ];
}
