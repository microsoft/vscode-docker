/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import { Repository } from './repository';

/** Class Azure Image: Used locally, Organizes data for managing images */
export class AzureImage {
    public created?: Date;
    public registry: Registry;
    public repository: Repository;
    public tag: string;
    public subscription: SubscriptionModels.Subscription;
    public resourceGroupName: string;
    public password?: string;
    public username?: string;

    constructor(repository: Repository, tag: string, created?: Date) {
        this.registry = repository.registry;
        this.repository = repository;
        this.tag = tag;
        this.subscription = repository.subscription;
        this.resourceGroupName = repository.resourceGroupName;
        if (created) { this.created = created; }
        if (repository.password) { this.password = repository.password; }
        if (repository.username) { this.username = repository.username; }
    }

    public toString = (): string => {
        return `${this.repository.name}:${this.tag}`;
    }
}
