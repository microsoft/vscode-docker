/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext, IAzureQuickPickItem, UserCancelledError } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { openExternal } from "../../utils/openExternal";
import { getThemedIconPath } from "../IconPath";
import { getRegistryProviders } from "./all/getRegistryProviders";
import { ConnectedRegistriesTreeItem } from "./ConnectedRegistriesTreeItem";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProvider } from "./IRegistryProvider";
import { IRegistryProviderTreeItem } from "./IRegistryProviderTreeItem";
import { ILogInWizardContext } from "./logInWizard/ILogInWizardContext";
import { RegistryPasswordStep } from "./logInWizard/RegistryPasswordStep";
import { RegistryUrlStep } from "./logInWizard/RegistryUrlStep";
import { RegistryUsernameStep } from "./logInWizard/RegistryUsernameStep";
import { anyContextValuePart, contextValueSeparator } from "./registryContextValues";
import { deleteRegistryPassword, setRegistryPassword } from "./registryPasswords";

const providersKey = 'docker.registryProviders';

export class RegistriesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'registries';
    public contextValue: string = RegistriesTreeItem.contextValue;
    public label: string = 'Registries';
    public childTypeLabel: string = 'registry provider';
    public autoSelectInTreeItemPicker: boolean = true;
    public _connectedRegistriesTreeItem: ConnectedRegistriesTreeItem;

    private _cachedProviders: ICachedRegistryProvider[];

    public constructor() {
        super(undefined);
        this._connectedRegistriesTreeItem = new ConnectedRegistriesTreeItem(this);
        this._cachedProviders = ext.context.globalState.get<ICachedRegistryProvider[]>(providersKey, []);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (this._cachedProviders.length === 0) {
            return [new GenericTreeItem(this, {
                label: 'Connect Registry...',
                contextValue: 'connectRegistry',
                iconPath: getThemedIconPath('connect'),
                commandId: 'vscode-docker.registries.connectRegistry'
            })];
        } else {
            this._connectedRegistriesTreeItem.children = [];
            const children: AzExtTreeItem[] = await this.createTreeItemsWithErrorHandling(
                this._cachedProviders,
                'invalidRegistryProvider',
                cachedProvider => {
                    const provider = getRegistryProviders().find(rp => rp.id === cachedProvider.id);
                    if (!provider) {
                        throw new Error(`Failed to find registry provider with id "${cachedProvider.id}".`);
                    }

                    const parent = provider.isSingleRegistry ? this._connectedRegistriesTreeItem : this;
                    const treeItem = this.initTreeItem(new provider.treeItemType(parent, cachedProvider));
                    if (provider.isSingleRegistry) {
                        this._connectedRegistriesTreeItem.children.push(treeItem);
                        return undefined;
                    } else {
                        return treeItem;
                    }
                },
                cachedInfo => cachedInfo.id
            );

            if (this._connectedRegistriesTreeItem.children.length > 0) {
                children.push(this._connectedRegistriesTreeItem);
            }

            return children;
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async connectRegistry(context: IActionContext): Promise<void> {
        let picks: IAzureQuickPickItem<IRegistryProvider | undefined>[] = getRegistryProviders().map(rp => {
            return {
                label: rp.label,
                description: rp.description,
                detail: rp.detail,
                data: rp
            };
        })
        picks = picks.sort((p1, p2) => p1.label.localeCompare(p2.label));
        picks.push({
            label: "$(link-external) Don't see your provider? Learn how to contribute...",
            data: undefined
        });

        let placeHolder: string = 'Select the provider for your registry';
        const provider = (await ext.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true })).data;
        if (!provider) {
            await openExternal('https://aka.ms/AA5g7n7');
            context.telemetry.properties.cancelStep = 'learnHowToContribute';
            throw new UserCancelledError();
        } else if (provider.onlyOneAllowed && this._cachedProviders.find(c => c.id === provider.id)) {
            throw new Error(`Only one provider with id "${provider.id}" is allowed at a time.`);
        }

        context.telemetry.properties.providerId = provider.id;
        context.telemetry.properties.providerApi = provider.api;

        let cachedProvider: ICachedRegistryProvider = {
            id: provider.id,
            api: provider.api,
        }

        if (provider.logInOptions) {
            const existingProviders: ICachedRegistryProvider[] = this._cachedProviders.filter(rp => rp.id === provider.id);
            const wizardContext: ILogInWizardContext = { ...context, ...provider.logInOptions, existingProviders };
            const wizard = new AzureWizard(wizardContext, {
                title: provider.logInOptions.wizardTitle,
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

            if (wizardContext.password) {
                await setRegistryPassword(cachedProvider, wizardContext.password);
            }
        }

        this._cachedProviders.push(cachedProvider);
        await this.saveCachedProviders();
    }

    public async disconnectRegistry(context: IActionContext, node: IRegistryProviderTreeItem): Promise<void> {
        context.telemetry.properties.providerId = node.cachedProvider.id;
        context.telemetry.properties.providerApi = node.cachedProvider.api;

        await deleteRegistryPassword(node.cachedProvider);

        const index = this._cachedProviders.findIndex(n => n === node.cachedProvider);
        if (index !== -1) {
            this._cachedProviders.splice(index, 1);
        }

        await this.saveCachedProviders();
    }

    public hasMultiplesOfProvider(cachedProvider: ICachedRegistryProvider): boolean {
        return this._cachedProviders.filter(c => c.id === cachedProvider.id).length > 1;
    }

    private async saveCachedProviders(): Promise<void> {
        await ext.context.globalState.update(providersKey, this._cachedProviders);
        await this.refresh();
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

        return node
    }
}
