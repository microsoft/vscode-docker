/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { getFromWorkspaceState, updateWorkspaceState } from '../../../utils/StateUtils';
import { TelemetryPromptStep } from '../TelemetryPromptStep';
import { NetChooseBuildTypeContext } from './netContainerBuild';

export const NetContainerBuildOptions = [
    'Use a Dockerfile',
    'Use .NET SDK'
] as const;

type NetContainerBuildOptionsTuple = typeof NetContainerBuildOptions;
export type NetContainerBuildOptions = NetContainerBuildOptionsTuple[number];

export class NetSdkChooseBuildStep extends TelemetryPromptStep<NetChooseBuildTypeContext> {
    public async prompt(wizardContext: NetChooseBuildTypeContext): Promise<void> {

        // get workspace momento storage
        const containerBuildOptions = await getFromWorkspaceState<NetContainerBuildOptions>('containerBuildOptions');

        // only remember if it was .NET SDK, otherwise prompt again
        if (containerBuildOptions === 'Use .NET SDK') { // only remember if it was .NET SDK, otherwise prompt again
            wizardContext.containerBuildOptions = containerBuildOptions;
            return;
        }

        const opt: vscode.QuickPickOptions = {
            matchOnDescription: true,
            matchOnDetail: true,
            placeHolder: vscode.l10n.t('How would you like to build your container image?'),
        };

        const buildOptions = NetContainerBuildOptions as readonly NetContainerBuildOptions[];
        const items = buildOptions.map(p => <IAzureQuickPickItem<NetContainerBuildOptions>>{ label: p, data: p });

        const response = await wizardContext.ui.showQuickPick(items, opt);
        wizardContext.containerBuildOptions = response.data;

        // update workspace momento storage
        await updateWorkspaceState<NetContainerBuildOptions>('containerBuildOptions', wizardContext.containerBuildOptions);
    }

    public shouldPrompt(wizardContext: NetChooseBuildTypeContext): boolean {
        return !wizardContext.containerBuildOptions;
    }

    protected setTelemetry(wizardContext: NetChooseBuildTypeContext): void {
        wizardContext.telemetry.properties.netSdkBuildStep = wizardContext.containerBuildOptions;
    }
}
