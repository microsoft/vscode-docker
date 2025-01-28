/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { createAzureRegistry } from '../../registries/azure/createAzureRegistry';
import { PushImageWizardContext } from './PushImageWizardContext';

export class CreatePickAcrPromptStep extends AzureWizardPromptStep<PushImageWizardContext> {
    public async prompt(wizardContext: PushImageWizardContext): Promise<void> {
        const acrs = await ext.registriesRoot.getChildren(wizardContext.azureSubscriptionNode) as UnifiedRegistryItem<CommonRegistry>[];
        const picks: IAzureQuickPickItem<string | UnifiedRegistryItem<CommonRegistry>>[] = acrs.map(acr => <IAzureQuickPickItem<UnifiedRegistryItem<CommonRegistry>>>{ label: acr.wrappedItem.label, data: acr });
        picks.push({ label: vscode.l10n.t('$(plus) Create new Azure Container Registry...'), data: 'create' });

        const response = await wizardContext.ui.showQuickPick(picks, { placeHolder: vscode.l10n.t('Select an Azure Container Registry to push to') });

        if (response.data === 'create') {
            const createdAcrName = await createAzureRegistry(wizardContext, wizardContext.azureSubscriptionNode);

            const acrNodes = await ext.registriesRoot.getChildren(wizardContext.azureSubscriptionNode) as UnifiedRegistryItem<CommonRegistry>[];
            const selectedAcrNode = acrNodes.find(acrNode => acrNode.wrappedItem.label === createdAcrName);
            wizardContext.connectedRegistry = selectedAcrNode;
        } else {
            wizardContext.connectedRegistry = response.data as UnifiedRegistryItem<CommonRegistry>;
        }
    }

    public shouldPrompt(wizardContext: PushImageWizardContext): boolean {
        return !!wizardContext.azureSubscriptionNode;
    }
}
