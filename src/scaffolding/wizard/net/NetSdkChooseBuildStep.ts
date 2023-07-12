/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { TelemetryPromptStep } from '../TelemetryPromptStep';
import { cSharpExtensionId, getMinimumCSharpExtensionExports } from '../netCore/netCoreStepUtils';
import { NetChooseBuildTypeContext } from './NetContainerBuild';

/** Key to .NET Container Build Options workplace momento storage */
export const NetContainerBuildOptionsKey = 'netContainerBuildOptions';

export const AllNetContainerBuildOptions = [
    vscode.l10n.t('Use a Dockerfile'),
    vscode.l10n.t('Use .NET SDK')
] as const;

type NetContainerBuildOptionsTuple = typeof AllNetContainerBuildOptions;
export type NetContainerBuildOption = NetContainerBuildOptionsTuple[number];

export class NetSdkChooseBuildStep extends TelemetryPromptStep<NetChooseBuildTypeContext> {
    public async prompt(wizardContext: NetChooseBuildTypeContext): Promise<void> {
        await this.ensureCSharpExtension(wizardContext);

        // get workspace momento storage
        const containerBuildOption = await ext.context.workspaceState.get<NetContainerBuildOption>(NetContainerBuildOptionsKey);

        // only remember if it was 'Use .NET SDK', otherwise prompt again
        if (containerBuildOption === AllNetContainerBuildOptions[1]) {
            wizardContext.containerBuildOption = containerBuildOption;
            return;
        }

        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: vscode.l10n.t('How would you like to build your container image?'),
        };

        const buildOptions = AllNetContainerBuildOptions as readonly NetContainerBuildOption[];
        const items = buildOptions.map(p => <IAzureQuickPickItem<NetContainerBuildOption>>{ label: p, data: p });

        const response = await wizardContext.ui.showQuickPick(items, opt);
        wizardContext.containerBuildOption = response.data;

        // update workspace momento storage
        await ext.context.workspaceState.update(NetContainerBuildOptionsKey, wizardContext.containerBuildOption);
    }

    public shouldPrompt(wizardContext: NetChooseBuildTypeContext): boolean {
        return !wizardContext.containerBuildOption;
    }

    protected setTelemetry(wizardContext: NetChooseBuildTypeContext): void {
        wizardContext.telemetry.properties.netSdkBuildStep = wizardContext.containerBuildOption;
    }

    private async ensureCSharpExtension(wizardContext: NetChooseBuildTypeContext): Promise<void> {
        try {
            await getMinimumCSharpExtensionExports();
        } catch (err) {
            // Suppress report issue and rethrow
            wizardContext.errorHandling.suppressReportIssue = true;
            wizardContext.errorHandling.buttons = [
                {
                    title: vscode.l10n.t('Open Extension'),
                    callback: async () => vscode.commands.executeCommand('extension.open', cSharpExtensionId),
                }
            ];
            throw err;
        }
    }
}
