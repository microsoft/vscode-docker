/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Registry as AcrRegistry, RegistryListCredentialsResult } from '@azure/arm-containerregistry';
import { AzureSubscription, VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2Repository, V2Tag, registryV2Request } from '@microsoft/vscode-docker-registries';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import * as vscode from 'vscode';
import { createAzureContainerRegistryClient, getResourceGroupFromId } from '../../../utils/azureUtils';
import { ACROAuthProvider } from './ACROAuthProvider';

export interface AzureRegistryItem extends V2RegistryItem {
    readonly subscription: AzureSubscription;
    readonly id: string;
}

export interface AzureSubscriptionRegistryItem extends CommonRegistryItem {
    readonly subscription: AzureSubscription;
    readonly type: 'azuresubscription';
}

export type AzureRegistry = V2Registry & AzureRegistryItem & {
    readonly registryProperties: AcrRegistry;
};

export type AzureRepository = V2Repository;

export type AzureTag = V2Tag;

export function isAzureSubscriptionRegistryItem(item: unknown): item is AzureSubscriptionRegistryItem {
    return !!item && typeof item === 'object' && (item as AzureSubscriptionRegistryItem).type === 'azuresubscription';
}

export function isAzureRegistryItem(item: unknown): item is AzureRegistry {
    return !!item && typeof item === 'object' && (item as AzureRegistryItem).additionalContextValues?.includes('azureContainerRegistry');
}

export function isAzureRepositoryItem(item: unknown): item is AzureRepository {
    return !!item && typeof item === 'object' && (item as AzureRepository).additionalContextValues?.includes('azureContainerRepository');
}

export function isAzureTagItem(item: unknown): item is AzureTag {
    return !!item && typeof item === 'object' && (item as AzureTag).additionalContextValues?.includes('azureContainerTag');
}

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
                    additionalContextValues: ['azuresubscription'],
                    iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureSubscription.svg'),
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

    public override async getRegistries(subscriptionItem: CommonRegistryItem): Promise<AzureRegistry[]> {
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
                baseUrl: vscode.Uri.parse(`https://${registry.loginServer}`),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                label: registry.name!,
                iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'resources', 'azureRegistry.svg'),
                subscription: subscriptionItem.subscription,
                additionalContextValues: ['azureContainerRegistry'],
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                id: registry.id!,
                registryProperties: registry
            };
        });
    }

    public override async getRepositories(registry: AzureRegistry): Promise<AzureRepository[]> {
        const repositories = await super.getRepositories(registry);
        const repositoriesWithAdditionalContext = repositories.map(repository => ({
            ...repository,
            additionalContextValues: ['azureContainerRepository']
        }));

        return repositoriesWithAdditionalContext;
    }

    public override async getTags(repository: AzureRepository): Promise<AzureTag[]> {
        const tags = await super.getTags(repository);
        const tagsWithAdditionalContext = tags.map(tag => ({
            ...tag,
            additionalContextValues: ['azureContainerTag']
        }));

        return tagsWithAdditionalContext;
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

    public async deleteRepository(item: AzureRepository): Promise<void> {
        const authenticationProvider = this.getAuthenticationProvider(item.parent as unknown as AzureRegistryItem);

        const reponse = await registryV2Request({
            method: 'DELETE',
            registryUri: item.baseUrl,
            path: ['v2', '_acr', `${item.label}`, 'repository'],
            scopes: [`repository:${item.label}:delete`],
            authenticationProvider: authenticationProvider,
        });

        if (!reponse.succeeded) {
            throw new Error(`Failed to delete repository: ${reponse.statusText}`);
        }
    }

    public async deleteRegistry(item: AzureRegistry): Promise<void> {
        const client = await createAzureContainerRegistryClient(item.subscription);
        const resourceGroup = getResourceGroupFromId(item.id);
        await client.registries.beginDeleteAndWait(resourceGroup, item.label);
    }

    public async untagImage(item: AzureTag): Promise<void> {
        const authenticationProvider = this.getAuthenticationProvider(item.parent.parent as unknown as AzureRegistryItem);

        const reponse = await registryV2Request({
            method: 'DELETE',
            registryUri: item.baseUrl,
            path: ['v2', '_acr', `${item.parent.label}`, 'tags', `${item.label}`],
            scopes: [`repository:${item.parent.label}:delete`],
            authenticationProvider: authenticationProvider,
        });

        if (!reponse.succeeded) {
            throw new Error(`Failed to delete tag: ${reponse.statusText}`);
        }
    }

    public async tryGetAdminCredentials(azureRegistry: AzureRegistry): Promise<RegistryListCredentialsResult | undefined> {
        if (azureRegistry.registryProperties.adminUserEnabled) {
            const client = await createAzureContainerRegistryClient(azureRegistry.subscription);
            return await client.registries.listCredentials(getResourceGroupFromId(azureRegistry.id), azureRegistry.label);
        } else {
            return undefined;
        }
    }

    protected override getAuthenticationProvider(item: AzureRegistryItem): ACROAuthProvider {
        const registryString = item.baseUrl.toString();

        if (!this.authenticationProviders.has(registryString)) {
            const provider = new ACROAuthProvider(item.baseUrl, item.subscription);
            this.authenticationProviders.set(registryString, provider);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.authenticationProviders.get(registryString)!;
    }
}
