/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureWizardPromptStep, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { AllPlatforms, Platform } from '../../utils/platform';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ChoosePlatformStep extends AzureWizardPromptStep<ScaffoldingWizardContext> {
    public constructor(private readonly platformsList?: Platform[]) {
        super();
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: localize('vscode-docker.scaffold.choosePlatformStep.selectPlatform', 'Select Application Platform')
        }

        const platforms = this.platformsList || AllPlatforms as readonly Platform[];

        const items = platforms.map(p => <IAzureQuickPickItem<Platform>>{ label: p, data: p });
        const response = await ext.ui.showQuickPick(items, opt);
        wizardContext.platform = response.data;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.platform;
    }
}
