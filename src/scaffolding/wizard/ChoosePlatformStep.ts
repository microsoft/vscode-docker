/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { AllPlatforms, Platform } from '../../utils/platform';
import { ChoosePortsStep } from './ChoosePortsStep';
import { GatherInformationStep } from './GatherInformationStep';
import { getJavaSubWizardOptions } from './java/JavaScaffoldingWizardContext';
import { getNetCoreSubWizardOptions } from './netCore/NetCoreScaffoldingWizardContext';
import { getNodeSubWizardOptions } from './node/NodeScaffoldingWizardContext';
import { getPythonSubWizardOptions } from './python/PythonScaffoldingWizardContext';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChoosePlatformStep extends TelemetryPromptStep<ScaffoldingWizardContext> {
    public constructor(private readonly platformsList?: Platform[]) {
        super();
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: localize('vscode-docker.scaffold.choosePlatformStep.selectPlatform', 'Select Application Platform')
        };

        const platforms = this.platformsList || AllPlatforms as readonly Platform[];

        const items: IAzureQuickPickItem<Platform>[] = platforms.map(p => {
            return { label: p, data: p };
        });

        const response = await wizardContext.ui.showQuickPick(items, opt);
        wizardContext.platform = response.data;
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return !wizardContext.platform;
    }

    public async getSubWizard(wizardContext: ScaffoldingWizardContext): Promise<IWizardOptions<ScaffoldingWizardContext> | undefined> {
        // No output is expected from this but it will call the setTelemetry method
        await super.getSubWizard(wizardContext);

        switch (wizardContext.platform) {
            case 'Node.js':
                return getNodeSubWizardOptions(wizardContext);
            case '.NET: ASP.NET Core':
            case '.NET: Core Console':
                return getNetCoreSubWizardOptions(wizardContext);
            case 'Python: Django':
            case 'Python: FastAPI':
            case 'Python: Flask':
            case 'Python: General':
                return getPythonSubWizardOptions(wizardContext);
            case 'Java':
                return getJavaSubWizardOptions(wizardContext);
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

    protected setTelemetry(wizardContext: ScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.configurePlatform = wizardContext.platform;
    }
}
