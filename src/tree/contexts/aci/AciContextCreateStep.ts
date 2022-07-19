/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep, parseError } from '@microsoft/vscode-azext-utils';
import { Progress } from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { execAsync } from '../../../utils/execAsync';
import { IAciWizardContext } from './IAciWizardContext';
import { executeAciCommandAsTask, flattenCommandLineArgs, throwIfNotInDocker } from '../../../utils/aciUtils';
import { composeArgs, withArg, withNamedArg } from '@microsoft/container-runtimes';

export class AciContextCreateStep extends AzureWizardExecuteStep<IAciWizardContext> {
    public priority: number = 200;

    public async execute(wizardContext: IAciWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        await throwIfNotInDocker(wizardContext);

        const creatingNewContext: string = localize('vscode-docker.commands.contexts.create.aci.creatingContext', 'Creating ACI context "{0}"...', wizardContext.contextName);
        const createdContext: string = localize('vscode-docker.commands.contexts.create.aci.createdContext', 'Created ACI context "{0}".', wizardContext.contextName);
        ext.outputChannel.appendLine(creatingNewContext);
        progress.report({ message: creatingNewContext });

        const command = await ext.runtimeManager.getCommand();
        const createContextArgs = composeArgs(
            withArg('context', 'create', 'aci'),
            withArg(wizardContext.contextName),
            withNamedArg('--subscription-id', wizardContext.subscriptionId),
            withNamedArg('--resource-group', wizardContext.resourceGroup.name)
        )();

        const createCommandLine = `${command} ${flattenCommandLineArgs(createContextArgs)}`;

        try {
            await execAsync(createCommandLine);
        } catch (err) {
            const error = parseError(err);

            if (error.errorType === '5' || /not logged in/i.test(error.message)) {
                // If error is due to being not logged in, we'll go through login and try again
                // Because login could involve device auth we do this step in the terminal
                const loginArgs = composeArgs(
                    withArg('login', 'azure'),
                    withNamedArg('--cloud-name', wizardContext.environment.name)
                )();
                await executeAciCommandAsTask(command, loginArgs, localize('vscode-docker.commands.contexts.create.aci.azureLogin', 'Azure Login'));
                await execAsync(createCommandLine);
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
