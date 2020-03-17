/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementClient, ContainerRegistryManagementModels as AcrModels } from 'azure-arm-containerregistry';
import { window } from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, createAzureClient, IActionContext, ICreateChildImplContext, ISubscriptionContext, LocationListStep, ResourceGroupListStep, SubscriptionTreeItemBase } from "vscode-azureextensionui";
import { localize } from '../../../localize';
import { nonNullProp } from '../../../utils/nonNull';
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "../IRegistryProviderTreeItem";
import { AzureAccountTreeItem } from './AzureAccountTreeItem';
import { AzureRegistryTreeItem } from './AzureRegistryTreeItem';
import { AzureRegistryCreateStep } from './createWizard/AzureRegistryCreateStep';
import { AzureRegistryNameStep } from './createWizard/AzureRegistryNameStep';
import { AzureRegistrySkuStep } from './createWizard/AzureRegistrySkuStep';
import { IAzureRegistryWizardContext } from './createWizard/IAzureRegistryWizardContext';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase implements IRegistryProviderTreeItem {
    public childTypeLabel: string = 'registry';
    public parent: AzureAccountTreeItem;

    private _nextLink: string | undefined;

    public constructor(parent: AzExtParentTreeItem, root: ISubscriptionContext, public readonly cachedProvider: ICachedRegistryProvider) {
        super(parent, root);
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: ContainerRegistryManagementClient = createAzureClient(this.root, ContainerRegistryManagementClient);
        let registryListResult: AcrModels.RegistryListResult = this._nextLink === undefined ?
            await client.registries.list() :
            await client.registries.listNext(this._nextLink);

        this._nextLink = registryListResult.nextLink;

        return await this.createTreeItemsWithErrorHandling(
            registryListResult,
            'invalidAzureRegistry',
            async r => new AzureRegistryTreeItem(this, this.cachedProvider, r),
            r => r.name
        );
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const wizardContext: IAzureRegistryWizardContext = { ...context, ...this.root };

        const promptSteps = [
            new AzureRegistryNameStep(),
            new AzureRegistrySkuStep(),
            new ResourceGroupListStep(),
        ];
        LocationListStep.addStep(wizardContext, promptSteps);

        const wizard = new AzureWizard(wizardContext, {
            promptSteps,
            executeSteps: [
                new AzureRegistryCreateStep()
            ],
            title: localize('vscode-docker.tree.registries.azure.createNew', 'Create new Azure Container Registry')
        });

        await wizard.prompt();
        const newRegistryName: string = nonNullProp(wizardContext, 'newRegistryName');
        context.showCreatingTreeItem(newRegistryName);
        await wizard.execute();

        // don't wait
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        window.showInformationMessage(`Successfully created registry "${newRegistryName}".`);
        return new AzureRegistryTreeItem(this, this.cachedProvider, nonNullProp(wizardContext, 'registry'));
    }
}
