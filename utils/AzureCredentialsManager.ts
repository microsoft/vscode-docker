import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureAccount } from '../typings/azure-account.api';
import { ServiceClientCredentials } from 'ms-rest';
import { AsyncPool } from '../utils/asyncpool';

const MAX_CONCURRENT_REQUESTS = 8;
const MAX_CONCURRENT_SUBSCRIPTON_REQUESTS = 5;

export class AzureCredentialsManager {

    private static _instance: AzureCredentialsManager = new AzureCredentialsManager();
    private azureAccount: AzureAccount;
    constructor() {
        if (AzureCredentialsManager._instance) {
            throw new Error("Error: Instantiation failed: Use SingletonClass.getInstance() instead of new.");
        }
        AzureCredentialsManager._instance = this;
    }

    public static getInstance(): AzureCredentialsManager {
        return AzureCredentialsManager._instance;
    }

    public setAccount(azureAccount) {
        this.azureAccount = azureAccount;
    }

    public getFilteredSubscriptionList(): SubscriptionModels.Subscription[] {
        return this.azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
            return {
                id: filter.subscription.id,
                session: filter.session,
                subscriptionId: filter.subscription.subscriptionId,
                tenantId: filter.session.tenantId,
                displayName: filter.subscription.displayName,
                state: filter.subscription.state,
                subscriptionPolicies: filter.subscription.subscriptionPolicies,
                authorizationSource: filter.subscription.authorizationSource
            };
        });
    }

    public getRegistries() {

    }

    public async getResourceGroups(subscription?: SubscriptionModels.Subscription) {
        if (subscription) {
            const resourceClient = new ResourceManagementClient(this.getCredentialByTenantId(subscription.tenantId, this.azureAccount), subscription.subscriptionId);
            return await resourceClient.resourceGroups.list();
        }
        const subs = this.getFilteredSubscriptionList();
        const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
        // let subsAndRegistries: { 'subscription': SubscriptionModels.Subscription, 'registries': ContainerModels.RegistryListResult, 'client': any }[] = [];
        //Acquire each subscription's data simultaneously
        // for (let i = 0; i < subs.length; i++) {
        //     subPool.addTask(async () => {
        //         const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[i].tenantId), subs[i].subscriptionId);
        //         subsAndRegistries.push({
        //             'subscription': subs[i],
        //             'registries': await client.registries.list(),
        //             'client': client
        //         });
        //     });
        // }
        // await subPool.scheduleRun();
        // const regPool = new asyncPool(MAX_CONCURRENT_REQUESTS);
        // for (let i = 0; i < subsAndRegistries.length; i++) {
        //     const client = subsAndRegistries[i].client;
        //     const registries = subsAndRegistries[i].registries;
        //     const subscription = subsAndRegistries[i].subscription;

        //     //Go through the registries and add them to the async pool
        //     for (let j = 0; j < registries.length; j++) {
        //         if (registries[j].adminUserEnabled && !registries[j].sku.tier.includes('Classic')) {
        //             const resourceGroup: string = registries[j].id.slice(registries[j].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[j].id.search('/providers/'));
        //             regPool.addTask(async () => {
        //                 let creds = await client.registries.listCredentials(resourceGroup, registries[j].name);
        //                 let iconPath = {
        //                     light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
        //                     dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
        //                 };
        //                 let node = new AzureRegistryNode(registries[j].loginServer, 'azureRegistryNode', iconPath, this._azureAccount);
        //                 node.type = RegistryType.Azure;
        //                 node.password = creds.passwords[0].value;
        //                 node.userName = creds.username;
        //                 node.subscription = subscription;
        //                 node.registry = registries[j];
        //                 azureRegistryNodes.push(node);
        //             });
        //         }
        //     }
        // }



    }

    private getCredentialByTenantId(tenantId: string, azureAccount: AzureAccount): ServiceClientCredentials {

        const session = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }
}
