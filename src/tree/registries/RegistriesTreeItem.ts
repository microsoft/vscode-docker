/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext, IAzureQuickPickItem, UserCancelledError, parseError } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { getRegistryProviders } from "./all/getRegistryProviders";
import { ConnectedRegistriesTreeItem } from "./ConnectedRegistriesTreeItem";
import { IConnectRegistryWizardContext } from "./connectWizard/IConnectRegistryWizardContext";
import { RegistryPasswordStep } from "./connectWizard/RegistryPasswordStep";
import { RegistryUrlStep } from "./connectWizard/RegistryUrlStep";
import { RegistryUsernameStep } from "./connectWizard/RegistryUsernameStep";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProvider } from "./IRegistryProvider";
import { IRegistryProviderTreeItem } from "./IRegistryProviderTreeItem";
import { anyContextValuePart, contextValueSeparator } from "./registryContextValues";
import { RegistryTreeItemBase } from "./RegistryTreeItemBase";

const providersKey = 'docker.registryProviders';

export class RegistriesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'registries';
    public contextValue: string = RegistriesTreeItem.contextValue;
    public label: string = localize('vscode-docker.tree.registries.registriesLabel', 'Registries');
    public childTypeLabel: string = 'registry provider';
    public autoSelectInTreeItemPicker: boolean = true;

    private _connectedRegistriesTreeItem: ConnectedRegistriesTreeItem;
    private _cachedProviders: ICachedRegistryProvider[];

    public constructor() {
        super(undefined);
        this._connectedRegistriesTreeItem = new ConnectedRegistriesTreeItem(this);
        this._cachedProviders = ext.context.globalState.get<ICachedRegistryProvider[]>(providersKey, []);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (this._cachedProviders.length === 0) {
            return [new GenericTreeItem(this, {
                label: localize('vscode-docker.tree.registries.connectRegistry', 'Connect Registry...'),
                contextValue: 'connectRegistry',
                iconPath: new ThemeIcon('plug'),
                includeInTreeItemPicker: true,
                commandId: 'vscode-docker.registries.connectRegistry'
            })];
        } else {
            this._connectedRegistriesTreeItem.children = [];
            const children: AzExtTreeItem[] = await this.createTreeItemsWithErrorHandling(
                this._cachedProviders,
                'invalidRegistryProvider',
                async cachedProvider => {
                    const provider = getRegistryProviders().find(rp => rp.id === cachedProvider.id);
                    if (!provider) {
                        throw new Error(localize('vscode-docker.tree.registries.noProvider', 'Failed to find registry provider with id "{0}".', cachedProvider.id));
                    }

                    const parent = provider.isSingleRegistry ? this._connectedRegistriesTreeItem : this;
                    return this.initTreeItem(await Promise.resolve(provider.treeItemFactory(parent, cachedProvider)));
                },
                cachedInfo => cachedInfo.id
            );

            this._connectedRegistriesTreeItem.children = children.filter(c => c.parent === this._connectedRegistriesTreeItem);
            if (this._connectedRegistriesTreeItem.children.length > 0) {
                children.push(this._connectedRegistriesTreeItem);
            }

            return children.filter(c => c.parent !== this._connectedRegistriesTreeItem);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async connectRegistry(context: IActionContext, provider?: IRegistryProvider, url?: string): Promise<void> {
        let picks: IAzureQuickPickItem<IRegistryProvider | undefined>[] = getRegistryProviders().map(rp => {
            return {
                label: rp.label,
                description: rp.description,
                detail: rp.detail,
                data: rp
            };
        });
        picks = picks.sort((p1, p2) => p1.label.localeCompare(p2.label));

        const placeHolder: string = localize('vscode-docker.tree.registries.selectProvider', 'Select the provider for your registry');
        provider = provider ?? (await context.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true })).data;
        if (!provider) {
            throw new UserCancelledError();
        } else if (provider.onlyOneAllowed && this._cachedProviders.find(c => c.id === provider.id)) {
            // Don't wait, no input to wait for anyway
            void context.ui.showWarningMessage(localize('vscode-docker.tree.registries.providerConnected', 'The "{0}" registry provider is already connected.', provider.label));
            throw new UserCancelledError('registryProviderAlreadyAdded');
        }

        context.telemetry.properties.providerId = provider.id;
        context.telemetry.properties.providerApi = provider.api;

        const cachedProvider: ICachedRegistryProvider = {
            id: provider.id,
            api: provider.api,
        };

        if (provider.connectWizardOptions) {
            const existingProviders: ICachedRegistryProvider[] = this._cachedProviders.filter(rp => rp.id === provider.id);
            const wizardContext: IConnectRegistryWizardContext = { ...context, ...provider.connectWizardOptions, url, existingProviders };
            const wizard = new AzureWizard(wizardContext, {
                title: provider.connectWizardOptions.wizardTitle,
                promptSteps: [
                    new RegistryUrlStep(),
                    new RegistryUsernameStep(),
                    new RegistryPasswordStep()
                ]
            });

            await wizard.prompt();
            await wizard.execute();

            cachedProvider.url = wizardContext.url;
            cachedProvider.username = wizardContext.username;

            if (wizardContext.secret && provider.persistAuth) {
                await provider.persistAuth(cachedProvider, wizardContext.secret);
            }
        }

        this._cachedProviders.push(cachedProvider);
        await this.saveCachedProviders(context);
    }

    public async disconnectRegistry(context: IActionContext, cachedProvider: ICachedRegistryProvider | undefined): Promise<void> {
        if (!cachedProvider) {
            const picks = this._cachedProviders.map(crp => {
                const provider = getRegistryProviders().find(rp => rp.id === crp.id);
                const label: string = (provider && provider.label) || crp.id;
                const descriptions: string[] = [];
                if (crp.username) {
                    descriptions.push(localize('vscode-docker.tree.registries.usernameDesc', 'Username: "{0}"', crp.username));
                }
                if (crp.url) {
                    descriptions.push(localize('vscode-docker.tree.registries.urlDesc', 'URL: "{0}"', crp.url));
                }
                return {
                    label,
                    description: descriptions[0],
                    detail: descriptions[1],
                    data: crp
                };
            });
            const placeHolder: string = localize('vscode-docker.tree.registries.selectDisconnect', 'Select the registry to disconnect');
            cachedProvider = (await context.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true })).data;
        }

        context.telemetry.properties.providerId = cachedProvider.id;
        context.telemetry.properties.providerApi = cachedProvider.api;

        // NOTE: Do not let failure prevent removal of the tree item.

        try {
            const provider = getRegistryProviders().find(rp => rp.id === cachedProvider.id);
            if (provider?.removeAuth) {
                await provider.removeAuth(cachedProvider);
            }
        } catch (err) {
            // Don't wait, no input to wait for anyway
            void context.ui.showWarningMessage(localize('vscode-docker.tree.registries.disconnectError', 'The registry password could not be removed from the cache: {0}', parseError(err).message));
        }

        const index = this._cachedProviders.findIndex(n => n === cachedProvider);
        if (index !== -1) {
            this._cachedProviders.splice(index, 1);
        }

        await this.saveCachedProviders(context);
    }

    public hasMultiplesOfProvider(cachedProvider: ICachedRegistryProvider): boolean {
        return this._cachedProviders.filter(c => c.id === cachedProvider.id).length > 1;
    }

    public async getAllConnectedRegistries(context: IActionContext): Promise<RegistryTreeItemBase[]> {
        return await recursiveGetAllConnectedRegistries(context, ext.registriesRoot);
    }

    private async saveCachedProviders(context: IActionContext): Promise<void> {
        await ext.context.globalState.update(providersKey, this._cachedProviders);
        await this.refresh(context);
    }

    private initTreeItem(node: AzExtParentTreeItem & IRegistryProviderTreeItem): AzExtParentTreeItem & IRegistryProviderTreeItem {
        // Forcing all registry providers to have the same `isAncestorOfImpl` so that a provider doesn't show up for another provider's commands
        node.isAncestorOfImpl = (expectedContextValue: string | RegExp) => {
            expectedContextValue = expectedContextValue instanceof RegExp ? expectedContextValue.source.toString() : expectedContextValue;

            if (!expectedContextValue.includes(contextValueSeparator)) {
                // If the expected context value has a non-standard format, just check against the id
                // For example 'azureTask' is non-standard since it is unique to azure
                return expectedContextValue.startsWith(node.cachedProvider.id);
            } else {
                const parts = expectedContextValue.split(contextValueSeparator);
                if (parts[0] !== anyContextValuePart) {
                    return parts[0] === node.cachedProvider.id;
                } else if (parts[1] !== anyContextValuePart) {
                    return parts[1] === node.cachedProvider.api;
                } else {
                    // expectedContextValue must not have specificied any particular id or api, so return true
                    return true;
                }
            }
        };

        return node;
    }
}

async function recursiveGetAllConnectedRegistries(context: IActionContext, node: AzExtParentTreeItem): Promise<RegistryTreeItemBase[]> {
    let results: RegistryTreeItemBase[] = [];

    for (const child of await node.getCachedChildren(context)) {
        if (child instanceof RegistryTreeItemBase) {
            results.push(child);
        } else if (child instanceof AzExtParentTreeItem) {
            results = results.concat(await recursiveGetAllConnectedRegistries(context, child));
        }
    }

    return results;
}
