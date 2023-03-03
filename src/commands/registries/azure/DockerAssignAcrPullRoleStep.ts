/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IAppServiceWizardContext } from "@microsoft/vscode-azext-azureappservice"; // These are only dev-time imports so don't need to be lazy
import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { randomUUID } from "crypto";
import { l10n, Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { AzureRegistryTreeItem } from '../../../tree/registries/azure/AzureRegistryTreeItem';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { getArmAuth, getArmContainerRegistry, getAzExtAppService, getAzExtAzureUtils } from "../../../utils/lazyPackages";

export class DockerAssignAcrPullRoleStep extends AzureWizardExecuteStep<IAppServiceWizardContext> {
    public priority: number = 141; // execute after DockerSiteCreateStep

    public constructor(private readonly tagTreeItem: RemoteTagTreeItem) {
        super();
    }

    public async execute(context: IAppServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = l10n.t('Granting permission for App Service to pull image from ACR...');
        ext.outputChannel.info(message);
        progress.report({ message: message });

        const azExtAzureUtils = await getAzExtAzureUtils();
        const vscAzureAppService = await getAzExtAppService();
        const armAuth = await getArmAuth();
        const armContainerRegistry = await getArmContainerRegistry();
        const authClient = azExtAzureUtils.createAzureClient(context, armAuth.AuthorizationManagementClient);
        const crmClient = azExtAzureUtils.createAzureClient(context, armContainerRegistry.ContainerRegistryManagementClient);
        const appSvcClient = await vscAzureAppService.createWebSiteClient(context);

        // If we're in `execute`, then `shouldExecute` passed and `this.tagTreeItem.parent.parent` is guaranteed to be an AzureRegistryTreeItem
        const registryTreeItem: AzureRegistryTreeItem = this.tagTreeItem.parent.parent as AzureRegistryTreeItem;

        // 1. Get the registry resource. We will need the ID.
        const registry = await crmClient.registries.get(registryTreeItem.resourceGroup, registryTreeItem.registryName);

        if (!(registry?.id)) {
            throw new Error(
                l10n.t('Unable to get details from Container Registry {0}', registryTreeItem.baseUrl)
            );
        }

        // 2. Get the role definition for the AcrPull role. We will need the definition ID. This role is built-in and should always exist.
        const acrPullRoleDefinition = (await authClient.roleDefinitions.list(registry.id, { filter: `roleName eq 'AcrPull'` }))[0];

        if (!(acrPullRoleDefinition?.id)) {
            throw new Error(
                l10n.t('Unable to get AcrPull role definition on subscription {0}', context.subscriptionId)
            );
        }

        // 3. Get the info for the now-created web site. We will need the principal ID.
        const siteInfo = await appSvcClient.webApps.get(context.site.resourceGroup, context.site.name);

        if (!(siteInfo?.identity?.principalId)) {
            throw new Error(
                l10n.t('Unable to get identity principal ID for web site {0}', context.site.name)
            );
        }

        // 4. On the registry, assign the AcrPull role to the principal representing the website
        await authClient.roleAssignments.create(registry.id, randomUUID(), {
            principalId: siteInfo.identity.principalId,
            roleDefinitionId: acrPullRoleDefinition.id,
            principalType: 'ServicePrincipal',
        });

        // 5. Set the web app to use the desired ACR image, which was not done in DockerSiteCreateStep. Get the config and then update it.
        const config = await appSvcClient.webApps.getConfiguration(context.site.resourceGroup, context.site.name);

        if (!config) {
            throw new Error(
                l10n.t('Unable to get configuration for web site {0}', context.site.name)
            );
        }

        config.linuxFxVersion = `DOCKER|${this.tagTreeItem.fullTag}`;
        await appSvcClient.webApps.updateConfiguration(context.site.resourceGroup, context.site.name, config);
    }

    public shouldExecute(context: IAppServiceWizardContext): boolean {
        return !!(context.site) && !!(this.tagTreeItem?.parent?.parent) && this.tagTreeItem.parent.parent instanceof AzureRegistryTreeItem
            && !context.customLocation;
    }
}
