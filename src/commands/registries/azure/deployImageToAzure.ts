/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ContainerRegistryManagementClient from 'azure-arm-containerregistry';
import { WebhookCreateParameters } from 'azure-arm-containerregistry/lib/models';
import { WebSiteManagementClient } from 'azure-arm-website';
import { Site, SiteConfig } from 'azure-arm-website/lib/models';
import { NameValuePair } from 'request';
import { Progress, window } from "vscode";
import * as vscode from 'vscode';
import { AppKind, AppServicePlanListStep, IAppServiceWizardContext, SiteClient, SiteNameStep, WebsiteOS } from "vscode-azureappservice";
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, createAzureClient, IActionContext, LocationListStep, ResourceGroupListStep } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { RegistryApi } from '../../../tree/registries/all/RegistryApi';
import { AzureAccountTreeItem } from '../../../tree/registries/azure/AzureAccountTreeItem';
import { azureRegistryProviderId } from '../../../tree/registries/azure/azureRegistryProvider';
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { AzureRepositoryTreeItem } from '../../../tree/registries/azure/AzureRepositoryTreeItem';
import { DockerHubNamespaceTreeItem } from '../../../tree/registries/dockerHub/DockerHubNamespaceTreeItem';
import { DockerHubRepositoryTreeItem } from '../../../tree/registries/dockerHub/DockerHubRepositoryTreeItem';
import { DockerV2RegistryTreeItemBase } from '../../../tree/registries/dockerV2/DockerV2RegistryTreeItemBase';
import { GenericDockerV2RegistryTreeItem } from '../../../tree/registries/dockerV2/GenericDockerV2RegistryTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { getRegistryPassword } from '../../../tree/registries/registryPasswords';
import { RegistryTreeItemBase } from '../../../tree/registries/RegistryTreeItemBase';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { nonNullProp, nonNullValueAndProp } from "../../../utils/nonNull";
import { openExternal } from '../../../utils/openExternal';

export async function deployImageToAzure(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    const wizardContext: IActionContext & Partial<IAppServiceWizardContext> = {
        ...context,
        newSiteOS: WebsiteOS.linux,
        newSiteKind: AppKind.app
    };
    const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
    // Create a temporary azure account tree item since Azure might not be connected
    const azureAccountTreeItem = new AzureAccountTreeItem(ext.registriesRoot, { id: azureRegistryProviderId, api: RegistryApi.DockerV2 });
    const subscriptionStep = await azureAccountTreeItem.getSubscriptionPromptStep(wizardContext);
    if (subscriptionStep) {
        promptSteps.push(subscriptionStep);
    }

    promptSteps.push(...[
        new SiteNameStep(),
        new ResourceGroupListStep(),
        new AppServicePlanListStep(),
        new LocationListStep()
    ]);

    // Get site config before running the wizard so that any problems with the tag tree item are shown at the beginning of the process
    const siteConfig: SiteConfig = await getNewSiteConfig(node);
    const executeSteps: AzureWizardExecuteStep<IAppServiceWizardContext>[] = [
        new DockerSiteCreateStep(siteConfig),
        new DockerWebhookCreateStep(node)
    ];

    const title = 'Create new web app';
    const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    await wizard.execute();

    const site: Site = nonNullProp(wizardContext, 'site');
    const createdNewWebApp: string = `Successfully created web app "${site.name}": https://${site.defaultHostName}`;
    ext.outputChannel.appendLine(createdNewWebApp);
    // don't wait
    window.showInformationMessage(createdNewWebApp);
}

async function getNewSiteConfig(node: RemoteTagTreeItem): Promise<SiteConfig> {
    let registryTI: RegistryTreeItemBase = node.parent.parent;

    let username: string | undefined;
    let password: string | undefined;
    let appSettings: NameValuePair[] = [];
    if (registryTI instanceof DockerHubNamespaceTreeItem) {
        username = registryTI.parent.username;
        password = await registryTI.parent.getPassword();
    } else if (registryTI instanceof DockerV2RegistryTreeItemBase) {
        appSettings.push({ name: "DOCKER_REGISTRY_SERVER_URL", value: registryTI.baseUrl });

        if (registryTI instanceof AzureRegistryTreeItem) {
            const cred = await registryTI.tryGetAdminCredentials();
            if (!cred) {
                throw new Error('Azure App service currently only supports running images from Azure Container Registries with admin enabled');
            } else {
                username = cred.username;
                password = nonNullProp(cred, 'passwords')[0].value;
            }
            appSettings.push({ name: "DOCKER_ENABLE_CI", value: 'true' });
        } else if (registryTI instanceof GenericDockerV2RegistryTreeItem) {
            username = registryTI.cachedProvider.username;
            password = await getRegistryPassword(registryTI.cachedProvider);
        } else {
            throw new RangeError(`Unrecognized node type "${registryTI.constructor.name}"`);
        }
    } else {
        throw new RangeError(`Unrecognized node type "${registryTI.constructor.name}"`);
    }

    if (username && password) {
        appSettings.push({ name: "DOCKER_REGISTRY_SERVER_USERNAME", value: username });
        appSettings.push({ name: "DOCKER_REGISTRY_SERVER_PASSWORD", value: password });
    }

    let linuxFxVersion = `DOCKER|${registryTI.baseImagePath}/${node.repoNameAndTag}`;

    return {
        linuxFxVersion,
        appSettings
    };
}

class DockerSiteCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 140;

    private _siteConfig: SiteConfig;

    public constructor(siteConfig: SiteConfig) {
        super();
        this._siteConfig = siteConfig;
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewApp: string = `Creating web app "${context.newSiteName}"...`;
        ext.outputChannel.appendLine(creatingNewApp);
        progress.report({ message: creatingNewApp });

        const client: WebSiteManagementClient = createAzureClient(context, WebSiteManagementClient);
        context.site = await client.webApps.createOrUpdate(nonNullValueAndProp(context.resourceGroup, 'name'), nonNullProp(context, 'newSiteName'), {
            name: context.newSiteName,
            kind: 'app,linux',
            location: nonNullValueAndProp(context.location, 'name'),
            serverFarmId: nonNullValueAndProp(context.plan, 'id'),
            siteConfig: this._siteConfig
        });
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !context.site;
    }
}

class DockerWebhookCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 141; // execute after DockerSiteCreate

    private _treeItem: RemoteTagTreeItem;

    public constructor(treeItem: RemoteTagTreeItem) {
        super();
        this._treeItem = treeItem;
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewApp: string = `Creating webhook for webapp "${context.newSiteName}"...`;
        ext.outputChannel.appendLine(creatingNewApp);
        progress.report({ message: creatingNewApp });

        const site: Site = nonNullProp(context, 'site');
        let siteClient = new SiteClient(site, context);
        let appUri: string = (await siteClient.getWebAppPublishCredential()).scmUri;
        if (this._treeItem.parent instanceof AzureRepositoryTreeItem) {
            await this.createWebhookForApp(this._treeItem, context, appUri);
        } else if (this._treeItem.parent instanceof DockerHubRepositoryTreeItem) {
            // point to dockerhub to create a webhook
            // http://cloud.docker.com/repository/docker/<registryName>/<repoName>/webHooks
            const dockerhubPrompt: string = "Copy web app endpoint and browse to dockerhub";
            let response: string = await vscode.window.showInformationMessage("Please browse to your dockerhub account to set up a CI/CD webhook", dockerhubPrompt);
            if (response) {
                await vscode.env.clipboard.writeText(appUri);
                await openExternal(`https://cloud.docker.com/repository/docker/${this._treeItem.parent.parent.parent.username}/${this._treeItem.parent.repoName}/webHooks`);
            }
        }

    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !!context.site;
    }

    private async createWebhookForApp(node: RemoteTagTreeItem, wizardContext: IActionContext & Partial<IAppServiceWizardContext>, appUri: string): Promise<void> {
        // fields derived from the app service wizard
        let siteName: string = wizardContext.site.name;
        let webhookName: string = `webapp${siteName}`;

        // variables derived from the container registry
        const registryTreeItem: AzureRegistryTreeItem = (<AzureRepositoryTreeItem>node.parent).parent;
        const crmClient = createAzureClient(registryTreeItem.parent.root, ContainerRegistryManagementClient);

        const existingWebhooks = await crmClient.webhooks.list(registryTreeItem.resourceGroup, registryTreeItem.registryName);
        if (existingWebhooks.find((hook) => hook.name === webhookName)) {
            return;
        }

        let webhookCreateParameters: WebhookCreateParameters = {
            location: registryTreeItem.registryLocation,
            serviceUri: appUri,
            scope: `${node.parent.repoName}:${node.tag}`,
            actions: ["push"],
            status: 'enabled'
        };

        const webhook = await crmClient.webhooks.create(registryTreeItem.resourceGroup, registryTreeItem.registryName, webhookName, webhookCreateParameters);
        ext.outputChannel.appendLine(`Created webhook '${webhook.name}' with scope '${webhook.scope}', id: '${webhook.id}' and location: '${webhook.location}'`);
    }
}
