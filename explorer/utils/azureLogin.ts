// if (element.label.includes('Azure')) {
//     // get azure credentials (or login)
//     // somehow find this registry
//     // enumerate...

//     if (azureAccount.status === "LoggedIn") {
//         //let creds = azureAccount.credentials;
//         const subs = await this.getSubscriptions(azureAccount);

//         for (let i = 0; i < subs.length; i++) {

//             let client = new ContainerRegistryManagement(subs[i].session.credentials, subs[i].subscription.subscriptionId);
//             client.registries.list().then((registries) => {
//                 console.log("list of registries");
//                 console.dir(registries, { depth: null, colors: true });
//             });
//         }


//     } else {
//         vscode.commands.executeCommand('azure-account.askForLogin').then((value) => {
//             if (value) {
//                 console.log("now logged in");
//             } else {
//                 console.log("log in failed");
//             }
//         })
//     }

// }

//     private async getSubscriptions(api: AzureAccount): Promise < SubscriptionItem[] > {

//     const subscriptionItems: SubscriptionItem[] = [];
//     for(const session of api.sessions) {
//         const credentials = session.credentials;
//         const subscriptionClient = new SubscriptionClient(credentials);
//         const subscriptions = await this.listAll(subscriptionClient.subscriptions, subscriptionClient.subscriptions.list());
//         subscriptionItems.push(...subscriptions.map(subscription => ({
//             label: subscription.displayName || '',
//             description: subscription.subscriptionId || '',
//             session,
//             subscription
//         })));
//     }
//         subscriptionItems.sort((a, b) => a.label.localeCompare(b.label));

//     return subscriptionItems;

// }


//     private async listAll<T>(client: { listNext(nextPageLink: string): Promise<PartialList<T>>; }, first: Promise<PartialList<T>>): Promise < T[] > {
//     const all: T[] = [];
//     for(let list = await first; list.length || list.nextLink; list = list.nextLink ? await client.listNext(list.nextLink) : []) {
//     all.push(...list);
// }
// return all;
//     }


// class Registry {
//     url: string;
//     registryType: RegistryType;
//     userName: string;
//     password: string;
//     token: string;
//     friendlyName: string;
// }

// interface SubscriptionItem {
//     label: string;
//     description: string;
//     session: AzureSession;
//     subscription: SubscriptionModels.Subscription;
// }

// interface PartialList<T> extends Array<T> {
//     nextLink?: string;
// }


import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
const ContainerRegistryManagement = require('azure-arm-containerregistry');
