/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WebSiteManagementClient, WebSiteManagementModels } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
import { Site } from '@azure/arm-appservice/esm/models';
import { Progress } from "vscode";
import { IAppServiceWizardContext } from "vscode-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzExtLocation, AzureWizardExecuteStep, createAzureClient, LocationListStep } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { RegistryTreeItemBase } from '../../../tree/registries/RegistryTreeItemBase';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { nonNullProp, nonNullValueAndProp } from "../../../utils/nonNull";

export class DockerSiteCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 140;

    public constructor(private readonly siteConfig: WebSiteManagementModels.SiteConfig, private readonly node: RemoteTagTreeItem) {
        super();
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewApp: string = localize('vscode-docker.commands.registries.azure.deployImage.creatingWebApp', 'Creating web app "{0}"...', context.newSiteName);
        ext.outputChannel.appendLine(creatingNewApp);
        progress.report({ message: creatingNewApp });
        const siteConfig = await this.getSiteConfig(context);
        const location: AzExtLocation = await LocationListStep.getLocation(context);
        const locationName: string = nonNullProp(location, 'name');

        const armAppService = await import('@azure/arm-appservice');
        const client: WebSiteManagementClient = createAzureClient(context, armAppService.WebSiteManagementClient);
        const siteEnvelope: Site = {
            name: context.newSiteName,
            location: locationName,
            serverFarmId: nonNullValueAndProp(context.plan, 'id'),
            siteConfig: siteConfig
        };

        if (context.customLocation) {
            // deploying to Azure Arc
            siteEnvelope.kind = 'app,linux,kubernetes,container';
        }
        else {
            siteEnvelope.identity = {
                type: 'SystemAssigned'
            };
        }

        context.site = await client.webApps.createOrUpdate(nonNullValueAndProp(context.resourceGroup, 'name'), nonNullProp(context, 'newSiteName'), siteEnvelope);
    }

    private async getSiteConfig(context: IAppServiceWizardContext): Promise<WebSiteManagementModels.SiteConfig> {
        // Temporary workaround until Arc adds support for managed identity, so use usename and password instead.
        // When customLocation is set, then user is deploying to Arc.
        const registryTreeItem: RegistryTreeItemBase = this.node.parent.parent;
        if (registryTreeItem instanceof AzureRegistryTreeItem && context.customLocation) {
            const appSettings: WebSiteManagementModels.NameValuePair[] = [];
            const cred = await registryTreeItem.tryGetAdminCredentials();
            if (!cred) {
                throw new Error(localize('vscode-docker.commands.registries.azure.dockersitecreatestep.notAdminEnabled', 'Azure App service deployment on Azure Arc only supports running images from Azure Container Registries with admin enabled'));
            } else {
                appSettings.push({ name: "DOCKER_REGISTRY_SERVER_URL", value: registryTreeItem.baseUrl });
                appSettings.push({ name: "DOCKER_REGISTRY_SERVER_USERNAME", value: cred.username });
                appSettings.push({ name: "DOCKER_REGISTRY_SERVER_PASSWORD", value: nonNullProp(cred, 'passwords')[0].value });
                appSettings.push({ name: "DOCKER_ENABLE_CI", value: 'true' });
                const linuxFxVersion = `DOCKER|${registryTreeItem.baseImagePath}/${this.node.repoNameAndTag}`;
                return {
                    linuxFxVersion,
                    appSettings
                };
            }
        }
        else {
            return this.siteConfig;
        }
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !context.site;
    }
}
