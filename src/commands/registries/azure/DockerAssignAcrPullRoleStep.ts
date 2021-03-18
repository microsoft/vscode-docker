/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Progress } from "vscode";
import { IAppServiceWizardContext } from "vscode-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';

export class DockerAssignAcrPullRoleStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 141; // execute after DockerSiteCreateStep

    public constructor(private readonly tagTreeItem: RemoteTagTreeItem) {
        super();
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('vscode-docker.commands.registries.azure.deployImage.assigningPullRole', 'Granting permission for App Service to pull image from ACR...');
        ext.outputChannel.appendLine(message);
        progress.report({ message: message });

        const armAuth = await import('@azure/arm-authorization');
        const armContainerRegistry = await import('@azure/arm-containerregistry');
        const armAppService = await import('@azure/arm-appservice');
        const authClient = createAzureClient(context, armAuth.AuthorizationManagementClient);
        const crmClient = createAzureClient(context, armContainerRegistry.ContainerRegistryManagementClient);
        const appSvcClient = createAzureClient(context, armAppService.WebSiteManagementClient);

        // If we're in execute, then `shouldExecute` passed and `this.treeItem.parent.parent` is guaranteed to be an AzureRegistryTreeItem
        const registryTreeItem: AzureRegistryTreeItem = this.tagTreeItem.parent.parent as AzureRegistryTreeItem;

        // 1. Get the registry resource. We will need the ID.
        const registry = await crmClient.registries.get(registryTreeItem.resourceGroup, registryTreeItem.registryName);

        // 2. Get the role definition for the AcrPull role. We will need the definition ID.
        const acrPullRoleDefinition = (await authClient.roleDefinitions.list(registry.id, { filter: `roleName eq 'AcrPull'` }))[0];

        // 3. Get the info for the now-created web site. We will need the principal ID.
        const siteInfo = await appSvcClient.webApps.get(context.site.resourceGroup, context.site.name);

        // 4. On the registry, assign the AcrPull role to the principal representing the website
        await authClient.roleAssignments.create(registry.id, (await import('uuid')).v4(), {
            principalId: siteInfo.identity.principalId,
            roleDefinitionId: acrPullRoleDefinition.id,
            principalType: 'ServicePrincipal',
        });
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !!(context.site) && !!(this.tagTreeItem?.parent?.parent) && this.tagTreeItem.parent.parent instanceof AzureRegistryTreeItem;
    }
}
