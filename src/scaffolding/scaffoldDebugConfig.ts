/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, AzureWizardPromptStep, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { copyWizardContext } from './copyWizardContext';
import { ChoosePlatformStep } from './wizard/ChoosePlatformStep';
import { ChooseWorkspaceFolderStep } from './wizard/ChooseWorkspaceFolderStep';
import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

export async function scaffoldDebugConfig(wizardContext: Partial<ScaffoldingWizardContext>, apiInput?: ScaffoldingWizardContext): Promise<void> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    copyWizardContext(wizardContext, apiInput);
    wizardContext.scaffoldType = 'debugging';

    const promptSteps: AzureWizardPromptStep<ScaffoldingWizardContext>[] = [
        new ChooseWorkspaceFolderStep(),
        new ChoosePlatformStep(['Node.js', '.NET: ASP.NET Core', '.NET: Console', 'Python: Django', 'Python: FastAPI', 'Python: Flask', 'Python: General']),
    ];

    const wizard = new AzureWizard<ScaffoldingWizardContext>(wizardContext as ScaffoldingWizardContext, {
        promptSteps: promptSteps,
        title: vscode.l10n.t('Initialize for Debugging'),
    });

    await wizard.prompt();
    await wizard.execute();
}
