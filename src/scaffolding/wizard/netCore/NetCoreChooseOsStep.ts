/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';
import { PlatformOS } from '../../../utils/platform';
import { TelemetryPromptStep } from '../TelemetryPromptStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

export class NetCoreChooseOsStep extends TelemetryPromptStep<NetCoreScaffoldingWizardContext> {
    public async prompt(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: localize('vscode-docker.scaffold.chooseOsStep.selectOS', 'Select Operating System'),
        };

        const OSes: PlatformOS[] = ['Linux', 'Windows'];
        const items = OSes.map(p => <IAzureQuickPickItem<PlatformOS>>{ label: p, data: p });

        const response = await wizardContext.ui.showQuickPick(items, opt);
        wizardContext.netCorePlatformOS = response.data;
    }

    public shouldPrompt(wizardContext: NetCoreScaffoldingWizardContext): boolean {
        return !wizardContext.netCorePlatformOS;
    }

    protected setTelemetry(wizardContext: NetCoreScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.configureOS = wizardContext.netCorePlatformOS;
    }
}
