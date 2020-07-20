/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureWizardPromptStep, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { PlatformOS } from '../../utils/platform';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ChooseOsStep extends AzureWizardPromptStep<ScaffoldingWizardContext> {
    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: localize('vscode-docker.scaffold.chooseOsStep.selectOS', 'Select Operating System')
        }

        const OSes: PlatformOS[] = ['Windows', 'Linux'];
        const items = OSes.map(p => <IAzureQuickPickItem<PlatformOS>>{ label: p, data: p });

        const response = await ext.ui.showQuickPick(items, opt);
        wizardContext.platformOs = response.data;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.platformOs;
    }
}
