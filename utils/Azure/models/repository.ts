import { Registry } from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as acrTools from '../../../utils/Azure/acrTools';

/** Class Repository: used locally, primarily for functions within azureUtils.ts and new commands such as delete Repository
 * refreshToken can be used like a password, and the username can be '00000000-0000-0000-0000-000000000000'
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
        this.resourceGroupName = acrTools.getResourceGroupName(registry);
        this.subscription = acrTools.getRegistrySubscription(registry);
        this.name = repository;
        if (accessToken) { this.accessToken = accessToken; }
        if (refreshToken) { this.refreshToken = refreshToken; }
        if (password) { this.password = password; }
        if (username) { this.username = username; }
    }
}
