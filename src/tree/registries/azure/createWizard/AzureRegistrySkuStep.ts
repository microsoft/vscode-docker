/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { IAzureRegistryWizardContext } from './IAzureRegistryWizardContext';

export class AzureRegistrySkuStep extends AzureWizardPromptStep<IAzureRegistryWizardContext> {
    public async prompt(context: IAzureRegistryWizardContext): Promise<void> {
        const skus = ["Basic", "Standard", "Premium"];
        const picks: IAzureQuickPickItem<string>[] = skus.map(s => { return { label: s, data: s }; });

        const placeHolder: string = localize('vscode-docker.tree.registries.azure.createWizard.selectSku', 'Select a SKU');
        context.newRegistrySku = (await ext.ui.showQuickPick(picks, { placeHolder })).data;
    }

    public shouldPrompt(context: IAzureRegistryWizardContext): boolean {
        return !context.newRegistrySku;
    }
}
