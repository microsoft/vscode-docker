/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Site } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
import type { IAppServiceWizardContext } from "@microsoft/vscode-azext-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from "@microsoft/vscode-azext-utils";
import { Uri, env, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { RegistryApi } from '../../../tree/registries/all/RegistryApi';
import { azureRegistryProviderId } from '../../../tree/registries/azure/azureRegistryProvider';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { getAzActTreeItem, getAzExtAppService, getAzExtAzureUtils } from '../../../utils/lazyPackages';
import { nonNullProp } from "../../../utils/nonNull";
import { DockerAssignAcrPullRoleStep } from './DockerAssignAcrPullRoleStep';
import { DockerSiteCreateStep } from './DockerSiteCreateStep';
import { DockerWebhookCreateStep } from './DockerWebhookCreateStep';
import { WebSitesPortPromptStep } from './WebSitesPortPromptStep';


export interface IAppServiceContainerWizardContext extends IAppServiceWizardContext {
    webSitesPort?: number;
}

export async function deployImageToAzure(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    const azExtAzureUtils = await getAzExtAzureUtils();
    const vscAzureAppService = await getAzExtAppService();
    const azActTreeItem = await getAzActTreeItem();

    const wizardContext: IActionContext & Partial<IAppServiceContainerWizardContext> = {
        ...context,
        newSiteOS: vscAzureAppService.WebsiteOS.linux,
        newSiteKind: vscAzureAppService.AppKind.app
    };
    const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
    // Create a temporary azure account tree item since Azure might not be connected
    const azureAccountTreeItem = new azActTreeItem.AzureAccountTreeItem(ext.registriesRoot, { id: azureRegistryProviderId, api: RegistryApi.DockerV2 });
    const subscriptionStep = await azureAccountTreeItem.getSubscriptionPromptStep(wizardContext);
    if (subscriptionStep) {
        promptSteps.push(subscriptionStep);
    }

    promptSteps.push(new vscAzureAppService.SiteNameStep());
    promptSteps.push(new azExtAzureUtils.ResourceGroupListStep());
    vscAzureAppService.CustomLocationListStep.addStep(wizardContext, promptSteps);
    promptSteps.push(new WebSitesPortPromptStep());
    promptSteps.push(new vscAzureAppService.AppServicePlanListStep());

    // Get site config before running the wizard so that any problems with the tag tree item are shown at the beginning of the process
    const executeSteps: AzureWizardExecuteStep<IAppServiceContainerWizardContext>[] = [
        new DockerSiteCreateStep(node),
        new DockerAssignAcrPullRoleStep(node),
        new DockerWebhookCreateStep(node),
    ];

    const title = localize('vscode-docker.commands.registries.azure.deployImage.title', 'Create new web app');
    const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    await wizard.execute();

    const site: Site = nonNullProp(wizardContext, 'site');
    const siteUri: string = `https://${site.defaultHostName}`;
    const createdNewWebApp: string = localize('vscode-docker.commands.registries.azure.deployImage.created', 'Successfully created web app "{0}": {1}', site.name, siteUri);
    ext.outputChannel.appendLine(createdNewWebApp);

    const openSite: string = localize('vscode-docker.commands.registries.azure.deployImage.openSite', 'Open Site');
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(createdNewWebApp, ...[openSite]).then((selection) => {
        if (selection === openSite) {
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            env.openExternal(Uri.parse(siteUri));
        }
    });
}
