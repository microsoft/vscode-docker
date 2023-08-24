/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilter, IActionContext, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryDataProvider } from '@microsoft/vscode-docker-registries';
import { ext } from '../extensionVariables';
import { UnifiedRegistryTreeDataProvider } from '../tree/registries/UnifiedRegistryTreeDataProvider';

export async function registryExperience<TPick>(context: IActionContext, tdp: CommonRegistryDataProvider | CommonRegistryDataProvider[], contextValueFilter: ContextValueFilter, skipIfOne: boolean = true): Promise<TPick> {
    let unifiedProvider: UnifiedRegistryTreeDataProvider | undefined;
    if (Array.isArray(tdp)) {
        unifiedProvider = new UnifiedRegistryTreeDataProvider(ext.context.globalState);
        for (const provider of tdp) {
            unifiedProvider.registerProvider(provider);
        }
    }

    const promptSteps: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RecursiveQuickPickStep(
            unifiedProvider || (tdp as CommonRegistryDataProvider),
            {
                contextValueFilter: contextValueFilter,
                skipIfOne: skipIfOne
            }
        )
    ];

    return await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: promptSteps,
    });
}
