/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as acrTools from '../acrTools';

/** Class Azure Repository: Used locally, Organizes data for managing Repositories */
export class AzureRepository {
        public registry: Registry;
        public name: string;
        public subscription: SubscriptionModels.Subscription;
        public resourceGroupName: string;
        public password?: string;
        public username?: string;

        private constructor() {
        }

        public static async Create(registry: Registry, repositoryName: string, password?: string, username?: string): Promise<AzureRepository> {
                let repository = new AzureRepository();

                repository.registry = registry;
                repository.resourceGroupName = acrTools.getResourceGroupName(registry);
                repository.subscription = await acrTools.getSubscriptionFromRegistry(registry);
                repository.name = repositoryName;
                repository.password = password;
                repository.username = username;

                return repository;
        }
}
