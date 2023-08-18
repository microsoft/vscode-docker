/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Site } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
import type { Webhook, WebhookCreateParameters } from '@azure/arm-containerregistry'; // These are only dev-time imports so don't need to be lazy
import type { IAppServiceWizardContext } from "@microsoft/vscode-azext-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizardExecuteStep, nonNullProp } from "@microsoft/vscode-azext-utils";
import { CommonTag, isDockerHubRepositoryItem } from '@microsoft/vscode-docker-registries';
import * as vscode from "vscode";
import { ext } from "../../../extensionVariables";
import { AzureRegistry, isAzureRepositoryItem } from '../../../tree/registries/Azure/AzureRegistryDataProvider';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getResourceGroupFromAzureRegistryItem } from '../../../tree/registries/registryTreeUtils';
import { cryptoUtils } from '../../../utils/cryptoUtils';
import { getArmContainerRegistry, getAzExtAppService, getAzExtAzureUtils } from "../../../utils/lazyPackages";

export class DockerWebhookCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 142; // execute after DockerAssignAcrPullRoleStep

    public constructor(private readonly tagItem: UnifiedRegistryItem<CommonTag>) {
        super();
    }

    public async execute(context: IAppServiceWizardContext, progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>): Promise<void> {
        const vscAzureAppService = await getAzExtAppService();
        vscAzureAppService.registerAppServiceExtensionVariables(ext);
        const site: Site = nonNullProp(context, 'site');
        const parsedSite = new vscAzureAppService.ParsedSite(site, context);
        const siteClient = await parsedSite.createClient(context);
        const appUri: string = (await siteClient.getWebAppPublishCredential()).scmUri;

        if (isAzureRepositoryItem(this.tagItem.parent)) {
            const creatingNewWebhook: string = vscode.l10n.t('Creating webhook for web app "{0}"...', context.newSiteName);
            ext.outputChannel.info(creatingNewWebhook);
            progress.report({ message: creatingNewWebhook });
            const webhook = await this.createWebhookForApp(context, context.site, appUri);
            ext.outputChannel.info(vscode.l10n.t('Created webhook "{0}" with scope "{1}", id: "{2}" and location: "{3}"', webhook.name, webhook.scope, webhook.id, webhook.location));
        } else if (isDockerHubRepositoryItem(this.tagItem.parent)) {
            // point to dockerhub to create a webhook
            // http://cloud.docker.com/repository/docker/<registryName>/<repoName>/webHooks
            const dockerhubPrompt: string = vscode.l10n.t('Copy & Open');
            const dockerhubUri: string = `https://cloud.docker.com/repository/docker/${this.tagItem.parent.parent.wrappedItem.label}/${this.tagItem.parent.wrappedItem.label}/webHooks`;

            // NOTE: The response to the information message is not awaited but handled independently of the wizard steps.
            //       VS Code will hide such messages in the notifications pane after a period of time; awaiting them risks
            //       the user never noticing them in the first place, which means the wizard would never complete, and the
            //       user left with the impression that the action never completes.

            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window
                .showInformationMessage(vscode.l10n.t('To set up a CI/CD webhook, open the page "{0}" and enter the URI to the created web app in your dockerhub account', dockerhubUri), dockerhubPrompt)
                .then(response => {
                    if (response) {
                        void vscode.env.clipboard.writeText(appUri);
                        void vscode.env.openExternal(vscode.Uri.parse(dockerhubUri));
                    }
                });
        }
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !!context.site && (isAzureRepositoryItem(this.tagItem.parent) || isDockerHubRepositoryItem(this.tagItem.parent));
    }

    private async createWebhookForApp(context: IAppServiceWizardContext, site: Site, appUri: string): Promise<Webhook | undefined> {
        const maxLength: number = 50;
        const numRandomChars: number = 6;

        let webhookName: string = site.name;
        // remove disallowed characters
        webhookName = webhookName.replace(/[^a-zA-Z0-9]/g, '');
        // trim to max length
        webhookName = webhookName.substr(0, maxLength - numRandomChars);
        // add random chars for uniqueness and to ensure min length is met
        webhookName += cryptoUtils.getRandomHexString(numRandomChars);

        // variables derived from the container registry
        const registryTreeItem: UnifiedRegistryItem<AzureRegistry> = this.tagItem.parent.parent as unknown as UnifiedRegistryItem<AzureRegistry>;
        const armContainerRegistry = await getArmContainerRegistry();
        const azExtAzureUtils = await getAzExtAzureUtils();
        const crmClient = azExtAzureUtils.createAzureClient(context, armContainerRegistry.ContainerRegistryManagementClient);
        const webhookCreateParameters: WebhookCreateParameters = {
            location: registryTreeItem.wrappedItem.registryProperties.location,
            serviceUri: appUri,
            scope: `${this.tagItem.parent.wrappedItem.label}:${this.tagItem.wrappedItem.label}`,
            actions: ["push"],
            status: 'enabled'
        };
        return await crmClient.webhooks.beginCreateAndWait(getResourceGroupFromAzureRegistryItem(registryTreeItem), registryTreeItem.wrappedItem.label, webhookName, webhookCreateParameters);
    }
}
