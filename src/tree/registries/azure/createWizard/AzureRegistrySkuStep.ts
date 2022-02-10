/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { SkuName as AcrSkuName } from '@azure/arm-containerregistry'; // These are only dev-time imports so don't need to be lazy
import { AzureWizardPromptStep, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../localize';
import { IAzureRegistryWizardContext } from './IAzureRegistryWizardContext';

export class AzureRegistrySkuStep extends AzureWizardPromptStep<IAzureRegistryWizardContext> {
    public async prompt(context: IAzureRegistryWizardContext): Promise<void> {
        const skus: AcrSkuName[] = ["Basic", "Standard", "Premium"];
        const picks: IAzureQuickPickItem<AcrSkuName>[] = skus.map(s => { return { label: s, data: s }; });

        const placeHolder: string = localize('vscode-docker.tree.registries.azure.createWizard.selectSku', 'Select a SKU');
        context.newRegistrySku = (await context.ui.showQuickPick(picks, { placeHolder })).data;
    }

    public shouldPrompt(context: IAzureRegistryWizardContext): boolean {
        return !context.newRegistrySku;
    }
}
