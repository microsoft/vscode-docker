/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Registry as AcrRegistry } from '@azure/arm-containerregistry';
import { AzureSubscription, VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem } from '@microsoft/vscode-docker-registries';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import * as vscode from 'vscode';
import { ACROAuthProvider } from './ACROAuthProvider';

interface AzureRegistryItem extends V2RegistryItem {
    readonly subscription: AzureSubscription;
}

interface AzureSubscriptionRegistryItem extends CommonRegistryItem {
    readonly subscription: AzureSubscription;
    readonly type: 'azuresubscription';
}

function isAzureSubscriptionRegistryItem(item: unknown): item is AzureSubscriptionRegistryItem {
    return !!item && typeof item === 'object' && (item as AzureSubscriptionRegistryItem).type === 'azuresubscription';
}

type AzureRegistry = V2Registry & AzureRegistryItem;

export class AzureRegistryDataProvider extends RegistryV2DataProvider implements vscode.Disposable {
    public readonly id = 'vscode-docker.azureContainerRegistry';
    public readonly label = vscode.l10n.t('Azure');
    public readonly iconPath = new vscode.ThemeIcon('azure');
    public readonly description = vscode.l10n.t('Azure Container Registry');

    private readonly subscriptionProvider = new VSCodeAzureSubscriptionProvider();
    private readonly authenticationProviders = new Map<string, ACROAuthProvider>(); // The tree items are too short-lived to store the associated auth provider so keep a cache

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();
    }

    public override async getChildren(element?: CommonRegistryItem | undefined): Promise<CommonRegistryItem[]> {
        if (isRegistryRoot(element)) {
            if (!await this.subscriptionProvider.isSignedIn()) {
                // TODO: show a node for sign in
                await this.subscriptionProvider.signIn();
                this.onDidChangeTreeDataEmitter.fire(element); // TODO: this fires too fast, need a "fire soon" analogue
                return [];
            }

            const subscriptions = await this.subscriptionProvider.getSubscriptions();

            return subscriptions.map(sub => {
                return {
                    parent: element,
                    label: sub.name,
                    type: 'azuresubscription',
                    subscription: sub,
                    additionalContextValues: ['azuresubscription']
                } as AzureSubscriptionRegistryItem;
            });
        } else if (isAzureSubscriptionRegistryItem(element)) {
            return await this.getRegistries(element);
        } else {
            const children = await super.getChildren(element);

            if ((element as AzureRegistryItem)?.subscription) {
                children.forEach(e => {
                    e.subscription = (element as AzureRegistryItem).subscription;
                });
            }

            return children;
        }
    }

    public dispose(): void {
        this.subscriptionProvider.dispose();
    }

    public async getRegistries(subscriptionItem: CommonRegistryItem): Promise<AzureRegistry[]> {
        subscriptionItem = subscriptionItem as AzureSubscriptionRegistryItem;
        // TODO: replace this with `createAzureClient`
        const acrClient = new (await import('@azure/arm-containerregistry')).ContainerRegistryManagementClient(subscriptionItem.subscription.credential, subscriptionItem.subscription.subscriptionId);

        const registries: AcrRegistry[] = [];

        for await (const registry of acrClient.registries.list()) {
            registries.push(registry);
        }

        return registries.map(registry => {
            return {
                parent: subscriptionItem,
                type: 'commonregistry',
                registryUri: vscode.Uri.parse(`https://${registry.loginServer}`),
                label: registry.name!,
                iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureRegistry.svg'),
                subscription: subscriptionItem.subscription,
            };
        });
    }

    public override getTreeItem(element: CommonRegistryItem): Promise<vscode.TreeItem> {
        if (isAzureSubscriptionRegistryItem(element)) {
            return Promise.resolve({
                label: element.label,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: 'azuresubscription',
                iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureSubscription.svg'),
            });
        } else {
            return super.getTreeItem(element);
        }
    }

    protected override getAuthenticationProvider(item: AzureRegistryItem): ACROAuthProvider {
        const registryString = item.registryUri.toString();

        if (!this.authenticationProviders.has(registryString)) {
            const provider = new ACROAuthProvider(item.registryUri, item.subscription);
            this.authenticationProviders.set(registryString, provider);
        }

        return this.authenticationProviders.get(registryString)!;
    }
}
