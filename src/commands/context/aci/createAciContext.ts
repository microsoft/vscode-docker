/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from 'vscode';
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, IResourceGroupWizardContext, LocationListStep, ResourceGroupListStep } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { RegistryApi } from '../../../tree/registries/all/RegistryApi';
import { AzureAccountTreeItem } from '../../../tree/registries/azure/AzureAccountTreeItem';
import { azureRegistryProviderId } from '../../../tree/registries/azure/azureRegistryProvider';
import { execAsync } from '../../../utils/spawnAsync';

interface IAciWizardContext extends IResourceGroupWizardContext {
    contextName: string;
}

export async function createAciContext(actionContext: IActionContext): Promise<void> {
    const wizardContext: IActionContext & Partial<IAciWizardContext> = {
        ...actionContext,
    };

    const promptSteps: AzureWizardPromptStep<IAciWizardContext>[] = [];
    // Create a temporary azure account tree item since Azure might not be connected
    const azureAccountTreeItem = new AzureAccountTreeItem(ext.registriesRoot, { id: azureRegistryProviderId, api: RegistryApi.DockerV2 });

    // Add a subscription prompt step (skipped if there is exactly one subscription)
    const subscriptionStep = await azureAccountTreeItem.getSubscriptionPromptStep(wizardContext);
    if (subscriptionStep) {
        promptSteps.push(subscriptionStep);
    }

    // Add additional prompt steps
    promptSteps.push(...[
        new ContextNameStep(),
        new ResourceGroupListStep(),
    ]);

    // Add a location prompt step
    LocationListStep.addStep(wizardContext, promptSteps);

    const executeSteps: AzureWizardExecuteStep<IAciWizardContext>[] = [
        new DockerLoginAzureStep(),
        new AciCreateStep(),
    ];

    const title = localize('vscode-docker.commands.contexts.create.aci.title', 'Create new Azure Container Instances context');

    const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    await wizard.execute();
}

class ContextNameStep extends AzureWizardPromptStep<IAciWizardContext> {
    public async prompt(context: IAciWizardContext): Promise<void> {
        context.contextName = await ext.ui.showInputBox({ prompt: localize('vscode-docker.commands.contexts.create.aci.enterContextName', 'Enter context name'), validateInput: validateContextName });
    }

    public shouldPrompt(wizardContext: IActionContext): boolean {
        return true;
    }
}

class DockerLoginAzureStep extends AzureWizardExecuteStep<IAciWizardContext> {
    public priority: number = 100;

    public async execute(wizardContext: IAciWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const loggingIn: string = localize('vscode-docker.commands.contexts.create.aci.loginAzure', 'Logging in to Azure...');
        ext.outputChannel.appendLine(loggingIn);
        progress.report({ message: loggingIn });

        await execAsync('docker login azure');
    }

    public shouldExecute(context: IAciWizardContext): boolean {
        return true;
    }
}

class AciCreateStep extends AzureWizardExecuteStep<IAciWizardContext> {
    public priority: number = 200;

    public async execute(wizardContext: IAciWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewContext: string = localize('vscode-docker.commands.contexts.create.aci.creatingContext', 'Creating ACI context "{0}"...', wizardContext.contextName);
        ext.outputChannel.appendLine(creatingNewContext);
        progress.report({ message: creatingNewContext });

        const command = `docker context create aci ${wizardContext.contextName} --subscription-id ${wizardContext.subscriptionId} --location ${wizardContext.location.name} --resource-group ${wizardContext.resourceGroup.name}`;
        await execAsync(command);
    }

    public shouldExecute(context: IAciWizardContext): boolean {
        return true;
    }
}

// Slightly more strict than CLI
const contextNameRegex = /^[a-z0-9][a-z0-9_-]+$/i;
function validateContextName(value: string | undefined): string | undefined {
    if (!contextNameRegex.test(value)) {
        return localize('vscode-docker.tree.contexts.create.aci.contextNameValidation', 'Context names must be start with an alphanumeric character and can only contain alphanumeric characters, underscores, and dashes.');
    } else {
        return undefined;
    }
}
