import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../../../typings/azure-account.api';
import { Repository } from '../models/repository';

/**
 * class Repository: used locally as of August 2018, primarily for functions within azureUtils.ts and new commands such as delete Repository
 * accessToken can be used like a password, and the username can be '00000000-0000-0000-0000-000000000000'
 */
export class AzureImage {
    public registry: Registry;
    public repository: Repository;
    public tag: string;
    public subscription: SubscriptionModels.Subscription;
    public resourceGroupName: string;
    public accessToken?: string;
    public refreshToken?: string;
    public password?: string;
    public username?: string;

    constructor(repository: Repository, tag: string) {
        this.registry = repository.registry;
        this.repository = repository;
        this.tag = tag;
        this.subscription = repository.subscription;
        this.resourceGroupName = repository.resourceGroupName;
        if (repository.accessToken) { this.accessToken = repository.accessToken; }
        if (repository.refreshToken) { this.refreshToken = repository.refreshToken; }
        if (repository.password) { this.password = repository.password; }
        if (repository.username) { this.username = repository.username; }
    }
}
