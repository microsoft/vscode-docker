/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Site } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
import type { IAppServiceWizardContext } from "@microsoft/vscode-azext-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, contextValueExperience, nonNullProp } from "@microsoft/vscode-azext-utils";
import { CommonTag } from '@microsoft/vscode-docker-registries';
import { Uri, env, l10n, window } from "vscode";
import { ext } from "../../../extensionVariables";
import { AzureSubscriptionRegistryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getAzExtAppService, getAzExtAzureUtils } from '../../../utils/lazyPackages';
import { DockerAssignAcrPullRoleStep } from './DockerAssignAcrPullRoleStep';
import { DockerSiteCreateStep } from './DockerSiteCreateStep';
import { DockerWebhookCreateStep } from './DockerWebhookCreateStep';
import { WebSitesPortPromptStep } from './WebSitesPortPromptStep';

export interface IAppServiceContainerWizardContext extends IAppServiceWizardContext {
    webSitesPort?: number;
}

export async function deployImageToAzure(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: 'commontag' });
    }

    const azExtAzureUtils = await getAzExtAzureUtils();
    const vscAzureAppService = await getAzExtAppService();

    const wizardContext: IActionContext & Partial<IAppServiceContainerWizardContext> = {
        ...context,
        newSiteOS: vscAzureAppService.WebsiteOS.linux,
        newSiteKind: vscAzureAppService.AppKind.app
    };

    const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
    // Create a temporary azure account tree item since Azure might not be connected
    const subscription = await contextValueExperience(context, ext.registriesTree, { include: 'azuresubscription' }) as UnifiedRegistryItem<AzureSubscriptionRegistryItem>;
    wizardContext.subscriptionId = subscription.wrappedItem.subscription.subscriptionId;

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

    const title = l10n.t('Create new web app');
    const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    await wizard.execute();

    const site: Site = nonNullProp(wizardContext, 'site');
    const siteUri: string = `https://${site.defaultHostName}`;
    const createdNewWebApp: string = l10n.t('Successfully created web app "{0}": {1}', site.name, siteUri);
    ext.outputChannel.info(createdNewWebApp);

    const openSite: string = l10n.t('Open Site');
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(createdNewWebApp, ...[openSite]).then((selection) => {
        if (selection === openSite) {
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            env.openExternal(Uri.parse(siteUri));
        }
    });
}
