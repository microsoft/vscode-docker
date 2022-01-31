/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { localize } from '../../localize';
import { RegistryApi } from "./all/RegistryApi";
import { azureRegistryProviderId } from "./azure/azureRegistryProvider";
import { dockerHubRegistryProviderId } from "./dockerHub/dockerHubRegistryProvider";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "./IRegistryProviderTreeItem";

export const registryProviderSuffix = 'RegistryProvider';
export const registrySuffix = 'Registry';
export const repositorySuffix = 'Repository';
export const tagSuffix = 'Tag';

export const contextValueSeparator = ';';
export const anyContextValuePart = '.*';

export function getRegistryContextValue(node: AzExtTreeItem & Partial<IRegistryProviderTreeItem>, ...suffixes: string[]): string {
    const cachedProvider = getCachedProvider(node);
    const parts = [cachedProvider.id, cachedProvider.api, ...suffixes];
    return parts.join(contextValueSeparator) + contextValueSeparator;
}

/**
 * Regular expressions used for the Tree Item Picker (which is used when a command is called from the command palette)
 * Registry providers only need to add an entry here if they support commands unique to their provider
 */
export const registryExpectedContextValues = {
    all: getRegistryExpectedContextValues({}),
    azure: getRegistryExpectedContextValues({ id: azureRegistryProviderId }),
    dockerHub: getRegistryExpectedContextValues({ id: dockerHubRegistryProviderId }),
    dockerV2: getRegistryExpectedContextValues({ api: RegistryApi.DockerV2 }),
};

function getRegistryExpectedContextValues(provider: Partial<ICachedRegistryProvider>): { registryProvider: RegExp, registry: RegExp, repository: RegExp, tag: RegExp } {
    return {
        registryProvider: convertToRegExp(provider, registryProviderSuffix),
        registry: convertToRegExp(provider, registrySuffix),
        repository: convertToRegExp(provider, repositorySuffix),
        tag: convertToRegExp(provider, tagSuffix)
    };
}

function convertToRegExp(provider: Partial<ICachedRegistryProvider>, suffix: string): RegExp {
    const parts = [provider.id, provider.api, suffix].map(p => p || anyContextValuePart);
    const value = parts.join(contextValueSeparator) + contextValueSeparator;
    return new RegExp(value.replace(/undefined/g, anyContextValuePart), 'i');
}

function getCachedProvider(node: AzExtTreeItem & Partial<IRegistryProviderTreeItem>): ICachedRegistryProvider {
    while (!node.cachedProvider) {
        if (!node.parent) {
            throw new Error(localize('vscode-docker.tree.registries.noCachedProvider', 'Failed to find cachedProvider'));
        } else {
            node = node.parent;
        }
    }

    return node.cachedProvider;
}
