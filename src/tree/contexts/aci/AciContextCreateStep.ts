/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep, parseError } from '@microsoft/vscode-azext-utils';
import { Progress } from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { executeAsTask } from '../../../utils/executeAsTask';
import { execAsync } from '../../../utils/spawnAsync';
import { IAciWizardContext } from './IAciWizardContext';

export class AciContextCreateStep extends AzureWizardExecuteStep<IAciWizardContext> {
    public priority: number = 200;

    public async execute(wizardContext: IAciWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewContext: string = localize('vscode-docker.commands.contexts.create.aci.creatingContext', 'Creating ACI context "{0}"...', wizardContext.contextName);
        const createdContext: string = localize('vscode-docker.commands.contexts.create.aci.createdContext', 'Created ACI context "{0}".', wizardContext.contextName);
        ext.outputChannel.appendLine(creatingNewContext);
        progress.report({ message: creatingNewContext });

        const command = `${ext.dockerContextManager.getDockerCommand(wizardContext)} context create aci ${wizardContext.contextName} --subscription-id ${wizardContext.subscriptionId} --resource-group ${wizardContext.resourceGroup.name}`;

        try {
            await execAsync(command);
        } catch (err) {
            const error = parseError(err);

            if (error.errorType === '5' || /not logged in/i.test(error.message)) {
                // If error is due to being not logged in, we'll go through login and try again
                // Because login could involve device auth we do this step in the terminal
                await executeAsTask(wizardContext, `${ext.dockerContextManager.getDockerCommand(wizardContext)} login azure --cloud-name ${wizardContext.environment.name}`, localize('vscode-docker.commands.contexts.create.aci.azureLogin', 'Azure Login'), { rejectOnError: true });
                await execAsync(command);
            } else {
                // Otherwise rethrow
                throw err;
            }
        }

        ext.outputChannel.appendLine(createdContext);
        progress.report({ message: createdContext });
    }

    public shouldExecute(context: IAciWizardContext): boolean {
        return true;
    }
}
