import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount, AzureSession } from '../../../typings/azure-account.api';
import * as acrTools from '../../../utils/Azure/acrTools';
/**
 * class Repository: used locally as of August 2018, primarily for functions within azureUtils.ts and new commands such as delete Repository
 * accessToken can be used like a password, and the username can be '00000000-0000-0000-0000-000000000000'
 */
export class Repository {
    public registry: Registry;
    public name: string;
    public subscription: SubscriptionModels.Subscription;
    public resourceGroupName: string;
    public accessToken?: string;
    public refreshToken?: string;
    public password?: string;
    public username?: string;

    constructor(registry: Registry, repository: string, accessToken?: string, refreshToken?: string, password?: string, username?: string) {
        this.registry = registry;
        this.resourceGroupName = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
        this.subscription = acrTools.getRegistrySubscription(registry);
        this.name = repository;
        if (accessToken) { this.accessToken = accessToken; }
        if (refreshToken) { this.refreshToken = refreshToken; }
        if (password) { this.password = password; }
        if (username) { this.username = username; }
    }

    public async  setTokens(registry: Registry): Promise<void> {
        let tokens = await acrTools.getRegistryTokens(registry);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
    }
}
