/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';

const IsRegistriesDataMigratedKey = 'isRegistryMigrated';
const OldRegistriesProvidersKey = 'docker.registryProviders';

// constants for generic v2 storage, see link below for more info:
// https://github.com/microsoft/vscode-docker-extensibility/blob/main/packages/vscode-docker-registries/src/clients/GenericRegistryV2/GenericRegistryV2DataProvider.ts
const GenericV2StorageKey = 'GenericV2ContainerRegistry';
const TrackedRegistriesKey = `${GenericV2StorageKey}.TrackedRegistries`;

/**
 * This function migrates the registries data from the old extension to the new one. It should be deleted after the migration is complete
 * after a few months or so.
 */
export async function migrateRegistriesData(ctx: vscode.ExtensionContext): Promise<void> {
    // check to see if we've already migrated
    if (ctx.globalState.get(IsRegistriesDataMigratedKey)) {
        return;
    }

    // get the old registry providers
    const oldRegistries = ctx.globalState.get<ICachedRegistryProvider[]>(OldRegistriesProvidersKey, []);
    for (const oldRegistry of oldRegistries) {
        if (!oldRegistry.id) {
            continue;
        }

        // provider id that we use to store providers that are connected to the tree
        let registryProviderId = undefined;
        // credential storage key that we use to store username and password
        let credentialStorageKey = undefined;

        switch (oldRegistry.id) {
            case "genericDockerV2":
                registryProviderId = ext.genericRegistryV2DataProvider.id;
                // we need to parse it as a uri so that the format is consistent with the new storage
                credentialStorageKey = vscode.Uri.parse(oldRegistry.url).toString();
                break;
            case "azure":
                registryProviderId = ext.azureRegistryDataProvider.id;
                // TODO: check that and make sure we shouldn't have to do anything here
                break;
            case "dockerHub":
                registryProviderId = ext.dockerHubRegistryDataProvider.id;
                credentialStorageKey = 'DockerHub';
                break;
        }

        // if we don't have a registry provider id, then we can't migrate
        if (!registryProviderId) {
            continue;
        }

        // add new registry provider to the list of providers
        await ext.registriesTree.storeRegistryProvider(registryProviderId);

        // if it's azure then our job is done
        if (registryProviderId === ext.azureRegistryDataProvider.id) {
            continue;
        }

        // if it's generic v2, then we need to store the url in the list of tracked registries
        if (registryProviderId === ext.genericRegistryV2DataProvider.id && credentialStorageKey) {
            const trackedRegistryStrings = ctx.globalState.get<string[]>(TrackedRegistriesKey, []);
            trackedRegistryStrings.push(credentialStorageKey);
            await ctx.globalState.update(TrackedRegistriesKey, trackedRegistryStrings);
        }

        // store username in new secret storage
        if (oldRegistry.username) {
            await ctx.globalState.update(`BasicAuthProvider.${credentialStorageKey}.username`, oldRegistry.username);
        }

        // set the password for the old registry in the new secret storage
        const password = await getRegistryPassword(oldRegistry);
        if (password) {
            await ctx.secrets.store(`BasicAuthProvider.${credentialStorageKey}.secret`, password);
        }
    }

    // don't wait & make the migration as done
    void ctx.globalState.update(IsRegistriesDataMigratedKey, true);
    void ext.registriesTree.refresh();
}

// --------------------------------------------------------------------------------------------
//
// Old code that we need to get the secrets from the old extension. This should be deleted after
// the migration is complete.
//
// -------------------------------------------------------------------------------------------
import * as crypto from 'crypto';
import { ext } from '../../extensionVariables';

export enum RegistryApi {
    /**
     * https://docs.docker.com/registry/spec/api/
     */
    DockerV2 = 'DockerV2',

    /**
     * https://docs.gitlab.com/ee/api/README.html
     * https://docs.gitlab.com/ee/api/container_registry.html
     */
    GitLabV4 = 'GitLabV4',

    /**
     * No public docs found
     */
    DockerHubV2 = 'DockerHubV2'
}

export interface ICachedRegistryProvider {
    id: string;
    api: RegistryApi;
    url?: string;
    username?: string;
}

export async function getRegistryPassword(cached: ICachedRegistryProvider): Promise<string | undefined> {
    return ext.context.secrets.get(getRegistryPasswordKey(cached));
}

function getRegistryPasswordKey(cached: ICachedRegistryProvider): string {
    return getPseudononymousStringHash(cached.id + cached.api + (cached.url || '') + (cached.username || ''));
}

function getPseudononymousStringHash(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
}
