/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as acrTools from '../acrTools';

/** Class Azure Repository: Used locally, Organizes data for managing Repositories */
export class Repository {
    public registry: Registry;
    public name: string;
    public subscription: SubscriptionModels.Subscription;
    public resourceGroupName: string;
    public password?: string;
    public username?: string;

    constructor(registry: Registry, repository: string, password?: string, username?: string) {
        this.registry = registry;
        this.resourceGroupName = acrTools.getResourceGroupName(registry);
        this.subscription = acrTools.getSubscriptionFromRegistry(registry);
        this.name = repository;
        if (password) { this.password = password; }
        if (username) { this.username = username; }
    }
}
