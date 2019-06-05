/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WebSiteManagementClient } from 'azure-arm-website';
import { SiteConfig } from 'azure-arm-website/lib/models';
import { AuthOptions, NameValuePair } from 'request';
import { Progress, window } from "vscode";
import { AppKind, AppServicePlanListStep, IAppServiceWizardContext, SiteNameStep, WebsiteOS } from "vscode-azureappservice";
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, createAzureClient, IActionContext, LocationListStep, ResourceGroupListStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { validateAzureAccountInstalled } from '../../tree/azure/AzureAccountTreeItem';
import { AzureRegistryTreeItem } from '../../tree/azure/AzureRegistryTreeItem';
import { DockerHubNamespaceTreeItem } from '../../tree/dockerHub/DockerHubNamespaceTreeItem';
import { PrivateRegistryTreeItem } from '../../tree/private/PrivateRegistryTreeItem';
import { RegistryTreeItemBase } from '../../tree/RegistryTreeItemBase';
import { RemoteTagTreeItemBase } from '../../tree/RemoteTagTreeItemBase';
import { nonNullProp, nonNullValueAndProp } from "../../utils/nonNull";

export async function deployImageToAzure(context: IActionContext, node?: RemoteTagTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItemBase>(RemoteTagTreeItemBase.allContextRegExp, context);
    }

    const wizardContext: IActionContext & Partial<IAppServiceWizardContext> = {
        ...context,
        newSiteOS: WebsiteOS.linux,
        newSiteKind: AppKind.app
    };
    const promptSteps: AzureWizardPromptStep<IAppServiceWizardContext>[] = [];
    const azureAccountTreeItem = await validateAzureAccountInstalled();
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
        new DockerSiteCreateStep(siteConfig)
    ];

    const title = 'Create new web app';
    const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
    await wizard.prompt();
    await wizard.execute();

    const site = nonNullProp(wizardContext, 'site');
    const createdNewWebApp: string = `Successfully created web app "${site.name}": https://${site.defaultHostName}`;
    ext.outputChannel.appendLine(createdNewWebApp);
    // don't wait
    window.showInformationMessage(createdNewWebApp);
}

async function getNewSiteConfig(node: RemoteTagTreeItemBase): Promise<SiteConfig> {
    let registryTI: RegistryTreeItemBase = node.parent.parent;

    let username: string | undefined;
    let password: string | undefined;
    let imagePath: string;
    let appSettings: NameValuePair[] = [];
    if (registryTI instanceof DockerHubNamespaceTreeItem) {
        imagePath = registryTI.namespace;
        username = registryTI.parent.username;
        password = registryTI.parent.password;

        if (!username || !password) {
            throw new Error("Failed to get credentials for Docker Hub.");
        }
    } else {
        imagePath = registryTI.host;
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
        } else if (registryTI instanceof PrivateRegistryTreeItem) {
            const auth: AuthOptions = await registryTI.getAuth();
            username = auth.username;
            password = auth.password;
        } else {
            throw new RangeError(`Unrecognized node type "${registryTI.constructor.name}"`);
        }

        if (!username || !password) {
            throw new Error(`Failed to get credentials for registry "${registryTI.host}".`);
        }
    }

    appSettings.push({ name: "DOCKER_REGISTRY_SERVER_USERNAME", value: username });
    appSettings.push({ name: "DOCKER_REGISTRY_SERVER_PASSWORD", value: password });

    let linuxFxVersion = `DOCKER|${imagePath}/${node.fullTag}`;

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
