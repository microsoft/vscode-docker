/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Registry as AcrRegistry, RegistryListCredentialsResult } from '@azure/arm-containerregistry';
import { AzureSubscription, VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem, V2Repository, V2Tag, getContextValue, registryV2Request } from '@microsoft/vscode-docker-registries';
import { CommonRegistryItem, isRegistry, isRegistryRoot, isRepository, isTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
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

export function isAzureRegistry(item: unknown): item is AzureRegistry {
    return isRegistry(item) && item.additionalContextValues?.includes('azure');
}

export function isAzureRepository(item: unknown): item is AzureRepository {
    return isRepository(item) && item.additionalContextValues?.includes('azure');
}

export function isAzureTag(item: unknown): item is AzureTag {
    return isTag(item) && item.additionalContextValues?.includes('azure');
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
                await this.subscriptionProvider.signIn();
            }

            const subscriptions = await this.subscriptionProvider.getSubscriptions();
            this.sendSubscriptionTelemetryIfNeeded();

            return subscriptions.map(sub => {
                return {
                    parent: element,
                    label: sub.name,
                    type: 'azuresubscription',
                    subscription: sub,
                    additionalContextValues: ['azuresubscription'],
                    iconPath: vscode.Uri.joinPath(this.extensionContext.extensionUri, 'dist', 'node_modules', '@microsoft', 'vscode-azext-azureutils', 'resources', 'azureSubscription.svg'),
                } as AzureSubscriptionRegistryItem;
            });
        } else if (isAzureSubscriptionRegistryItem(element)) {
            const registries = await this.getRegistries(element);
            registries.forEach(registry => {
                registry.additionalContextValues = [...(registry.additionalContextValues || []), 'azure'];
            });
            return registries;
        } else {
            const children = await super.getChildren(element);

            if ((element as AzureRegistryItem)?.subscription) {
                children.forEach(e => {
                    e.subscription = (element as AzureRegistryItem).subscription;
                    e.additionalContextValues = [...(e.additionalContextValues || []), 'azure'];
                });
            }

            return children;
        }
    }

    public dispose(): void {
        super.dispose();
        this.subscriptionProvider.dispose();
    }

    public override async getRegistries(subscriptionItem: CommonRegistryItem): Promise<AzureRegistry[]> {
        subscriptionItem = subscriptionItem as AzureSubscriptionRegistryItem;

        const acrClient = await createAzureContainerRegistryClient(subscriptionItem.subscription);
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

    public override getTreeItem(element: CommonRegistryItem): Promise<vscode.TreeItem> {
        if (isAzureSubscriptionRegistryItem(element)) {
            return Promise.resolve({
                label: element.label,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: getContextValue(element),
                iconPath: element.iconPath,
            });
        } else {
            return super.getTreeItem(element);
        }
    }

    public async deleteRepository(item: AzureRepository): Promise<void> {
        const authenticationProvider = this.getAuthenticationProvider(item.parent as unknown as AzureRegistryItem);
        const requestUrl = item.baseUrl.with({ path: `v2/_acr/${item.label}/repository` });
        const reponse = await registryV2Request({
            method: 'DELETE',
            requestUri: requestUrl,
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
        const requestUrl = item.baseUrl.with({ path: `v2/_acr/${item.parent.label}/tags/${item.label}` });
        const reponse = await registryV2Request({
            method: 'DELETE',
            requestUri: requestUrl,
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

    private hasSentSubscriptionTelemetry = false;
    private sendSubscriptionTelemetryIfNeeded(): void {
        if (this.hasSentSubscriptionTelemetry) {
            return;
        }
        this.hasSentSubscriptionTelemetry = true;

        // This event is relied upon by the DevDiv Analytics and Growth Team
        void callWithTelemetryAndErrorHandling('updateSubscriptionsAndTenants', async (context: IActionContext) => {
            context.telemetry.properties.isActivationEvent = 'true';
            context.errorHandling.suppressDisplay = true;

            const subscriptions = await this.subscriptionProvider.getSubscriptions(false);

            const tenantSet = new Set<string>();
            const subscriptionSet = new Set<string>();
            subscriptions.forEach(sub => {
                tenantSet.add(sub.tenantId);
                subscriptionSet.add(sub.subscriptionId);
            });

            // Number of tenants and subscriptions really belong in Measurements but for backwards compatibility
            // they will be put into Properties instead.
            context.telemetry.properties.numtenants = tenantSet.size.toString();
            context.telemetry.properties.numsubscriptions = subscriptionSet.size.toString();
            context.telemetry.properties.subscriptions = JSON.stringify(Array.from(subscriptionSet));
        });
    }
}
