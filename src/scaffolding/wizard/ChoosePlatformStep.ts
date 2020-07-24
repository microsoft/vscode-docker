/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureWizardPromptStep, IAzureQuickPickItem, IWizardOptions } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { AllPlatforms, Platform } from '../../utils/platform';
import { ChoosePortsStep } from './ChoosePortsStep';
import { GatherInformationStep } from './GatherInformationStep';
import { getJavaSubwizardOptions } from './java/JavaScaffoldingWizardContext';
import { getNetCoreSubwizardOptions } from './netCore/NetCoreScaffoldingWizardContext';
import { getNodeSubwizardOptions } from './node/NodeScaffoldingWizardContext';
import { getPythonSubwizardOptions } from './python/PythonScaffoldingWizardContext';
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

        const items: IAzureQuickPickItem<Platform>[] = platforms.map(p => {
            return { label: p, data: p };
        });

        const response = await ext.ui.showQuickPick(items, opt);
        wizardContext.platform = response.data;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.platform;
    }

    public async getSubWizard(wizardContext: ScaffoldingWizardContext): Promise<IWizardOptions<ScaffoldingWizardContext> | undefined> {
        switch (wizardContext.platform) {
            case 'Node.js':
                return getNodeSubwizardOptions(wizardContext);
            case '.NET: ASP.NET Core':
            case '.NET: Core Console':
                return getNetCoreSubwizardOptions(wizardContext);
            case 'Python: Django':
            case 'Python: Flask':
            case 'Python: General':
                return getPythonSubwizardOptions(wizardContext);
            case 'Java':
                return getJavaSubwizardOptions(wizardContext);
            case 'Go':
            case 'Ruby':
                // Too simple to justify having their own methods
                return {
                    promptSteps: [
                        new ChoosePortsStep([3000]),
                        new GatherInformationStep(),
                    ]
                };

            case 'C++':
            case 'Other':
                // Too simple to justify having their own methods
                return {
                    promptSteps: [
                        new GatherInformationStep(),
                    ]
                };

            default:
                throw new Error(localize('vscode-docker.scaffold.choosePlatformStep.unexpectedPlatform', 'Unexpected platform'));
        }
    }
}
