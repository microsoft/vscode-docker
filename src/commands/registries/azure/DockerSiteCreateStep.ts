/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WebSiteManagementClient, WebSiteManagementModels } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
import { Progress } from "vscode";
import { IAppServiceWizardContext } from "vscode-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { nonNullProp, nonNullValueAndProp } from "../../../utils/nonNull";

export class DockerSiteCreateStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 140;

    public constructor(private readonly siteConfig: WebSiteManagementModels.SiteConfig) {
        super();
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewApp: string = localize('vscode-docker.commands.registries.azure.deployImage.creatingWebApp', 'Creating web app "{0}"...', context.newSiteName);
        ext.outputChannel.appendLine(creatingNewApp);
        progress.report({ message: creatingNewApp });

        const armAppService = await import('@azure/arm-appservice');
        const client: WebSiteManagementClient = createAzureClient(context, armAppService.WebSiteManagementClient);
        context.site = await client.webApps.createOrUpdate(nonNullValueAndProp(context.resourceGroup, 'name'), nonNullProp(context, 'newSiteName'), {
            name: context.newSiteName,
            kind: 'app,linux',
            location: nonNullValueAndProp(context.location, 'name'),
            serverFarmId: nonNullValueAndProp(context.plan, 'id'),
            siteConfig: this.siteConfig,
            identity: {
                type: 'SystemAssigned'
            },
        });
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !context.site;
    }
}
