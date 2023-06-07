/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, AzureWizardPromptStep, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { NetContainerBuildOptions, NetSdkChooseBuildStep } from './NetSdkChooseBuildStep';

export interface NetChooseBuildTypeContext extends ScaffoldingWizardContext {
    containerBuildOptions?: NetContainerBuildOptions;
}

export async function netContainerBuild(wizardContext: Partial<NetChooseBuildTypeContext>, apiInput?: NetChooseBuildTypeContext): Promise<void> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    const promptSteps: AzureWizardPromptStep<NetChooseBuildTypeContext>[] = [
        new NetSdkChooseBuildStep()
    ];

    const wizard = new AzureWizard<NetChooseBuildTypeContext>(wizardContext as NetChooseBuildTypeContext, {
        promptSteps: promptSteps,
        title: vscode.l10n.t('Initialize for Debugging'),
    });

    await wizard.prompt();
    await wizard.execute();
}
