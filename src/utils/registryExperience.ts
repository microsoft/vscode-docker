/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilter, IActionContext, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function registryExperience<TPick>(context: IActionContext, tdp: vscode.TreeDataProvider<unknown>, contextValueFilter: ContextValueFilter, skipIfOne: boolean = true): Promise<TPick> {
    const promptSteps: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RecursiveQuickPickStep(
            tdp,
            {
                contextValueFilter: contextValueFilter,
                skipIfOne: true
            }
        )
    ];

    return await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: promptSteps,
    });
}
