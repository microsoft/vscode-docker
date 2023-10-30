/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import { Progress } from 'vscode';
import { ext } from '../../../extensionVariables';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { createAzureRegistry } from '../../registries/azure/createAzureRegistry';
import { PushImageWizardContext } from './PushImageWizardContext';

export class CreateAcrStep extends AzureWizardExecuteStep<PushImageWizardContext> {
    public priority: number = 100;

    public async execute(wizardContext: PushImageWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        const createdAcrName = await createAzureRegistry(wizardContext, wizardContext.azureSubscriptionNode);

        const acrNodes = await ext.registriesRoot.getChildren(wizardContext.azureSubscriptionNode) as UnifiedRegistryItem<CommonRegistry>[];
        const selectedAcrNode = acrNodes.find(acrNode => acrNode.wrappedItem.label === createdAcrName);
        wizardContext.connectedRegistry = selectedAcrNode;
    }

    public shouldExecute(wizardContext: PushImageWizardContext): boolean {
        return !!wizardContext.azureSubscriptionNode && !!wizardContext.createAcr;
    }
}
