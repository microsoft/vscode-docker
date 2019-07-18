/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ContainerRegistryManagementClient from 'azure-arm-containerregistry';
import { Webhook, WebhookCreateParameters } from 'azure-arm-containerregistry/lib/models';
import { Site } from 'azure-arm-website/lib/models';
import { Progress } from "vscode";
import * as vscode from "vscode";
import { IAppServiceWizardContext, SiteClient } from "vscode-azureappservice";
import { AzureWizardExecuteStep, createAzureClient, IActionContext } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { AzureRepositoryTreeItem } from '../../../tree/registries/azure/AzureRepositoryTreeItem';
import { DockerHubRepositoryTreeItem } from '../../../tree/registries/dockerHub/DockerHubRepositoryTreeItem';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { nonNullProp } from "../../../utils/nonNull";
import { openExternal } from '../../../utils/openExternal';

export class DockerWebhookCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 141; // execute after DockerSiteCreate
    private _treeItem: RemoteTagTreeItem;
    public constructor(treeItem: RemoteTagTreeItem) {
        super();
        this._treeItem = treeItem;
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{
        message?: string;
        increment?: number;
    }>): Promise<void> {
        const site: Site = nonNullProp(context, 'site');
        let siteClient = new SiteClient(site, context);
        let appUri: string = (await siteClient.getWebAppPublishCredential()).scmUri;
        if (this._treeItem.parent instanceof AzureRepositoryTreeItem) {
            const creatingNewApp: string = `Creating webhook for webapp "${context.newSiteName}"...`;
            ext.outputChannel.appendLine(creatingNewApp);
            progress.report({ message: creatingNewApp });
            const webhook = await this.createWebhookForApp(this._treeItem, context, appUri);
            ext.outputChannel.appendLine(`Created webhook '${webhook.name}' with scope '${webhook.scope}', id: '${webhook.id}' and location: '${webhook.location}'`);
        } else if (this._treeItem.parent instanceof DockerHubRepositoryTreeItem) {
            // point to dockerhub to create a webhook
            // http://cloud.docker.com/repository/docker/<registryName>/<repoName>/webHooks
            const dockerhubPrompt: string = "Copy web app endpoint and browse to dockerhub";
            let response: string = await vscode.window.showInformationMessage("Please browse to your dockerhub account to set up a CI/CD webhook", dockerhubPrompt);
            if (response) {
                vscode.env.clipboard.writeText(appUri);
                // tslint:disable-next-line: no-floating-promises
                openExternal(`https://cloud.docker.com/repository/docker/${this._treeItem.parent.parent.parent.username}/${this._treeItem.parent.repoName}/webHooks`);
            }
        }
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !!context.site && (this._treeItem.parent instanceof AzureRepositoryTreeItem || this._treeItem.parent instanceof DockerHubRepositoryTreeItem);
    }

    private async createWebhookForApp(node: RemoteTagTreeItem, wizardContext: IActionContext & Partial<IAppServiceWizardContext>, appUri: string): Promise<Webhook | undefined> {
        // fields derived from the app service wizard
        let siteName: string = wizardContext.site.name;
        let baseName = `webapp${siteName}`;
        let webhookName: string = baseName;
        // variables derived from the container registry
        const registryTreeItem: AzureRegistryTreeItem = (<AzureRepositoryTreeItem>node.parent).parent;
        const crmClient = createAzureClient(registryTreeItem.parent.root, ContainerRegistryManagementClient);
        const existingWebhooks = await crmClient.webhooks.list(registryTreeItem.resourceGroup, registryTreeItem.registryName);
        let dedupeCount: number = 0;
        while (existingWebhooks.find((hook) => hook.name === webhookName)) {
            webhookName = `${baseName}_${dedupeCount}`;
            dedupeCount++;
        }
        let webhookCreateParameters: WebhookCreateParameters = {
            location: registryTreeItem.registryLocation,
            serviceUri: appUri,
            scope: `${node.parent.repoName}:${node.tag}`,
            actions: ["push"],
            status: 'enabled'
        };
        return await crmClient.webhooks.create(registryTreeItem.resourceGroup, registryTreeItem.registryName, webhookName, webhookCreateParameters);
    }
}
