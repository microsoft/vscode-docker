// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import type { NameValuePair, Site, SiteConfig, WebSiteManagementClient } from '@azure/arm-appservice'; // These are only dev-time imports so don't need to be lazy
// import type { CustomLocation } from "@microsoft/vscode-azext-azureappservice"; // These are only dev-time imports so don't need to be lazy
// import type { AzExtLocation } from '@microsoft/vscode-azext-azureutils'; // These are only dev-time imports so don't need to be lazy
// import { AzureWizardExecuteStep, nonNullProp, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
// import { Progress, l10n } from "vscode";
// import { ext } from "../../../extensionVariables";
// import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
// import { getAzExtAppService, getAzExtAzureUtils } from '../../../utils/lazyPackages';
// import { IAppServiceContainerWizardContext } from './deployImageToAzure';

// export class DockerSiteCreateStep extends AzureWizardExecuteStep<IAppServiceContainerWizardContext> {
//     public priority: number = 140;

//     public constructor(private readonly node: UnifiedRegistryItem<unknown>) {
//         super();
//     }

//     public async execute(context: IAppServiceContainerWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
//         const creatingNewApp: string = l10n.t('Creating web app "{0}"...', context.newSiteName);
//         ext.outputChannel.info(creatingNewApp);
//         progress.report({ message: creatingNewApp });
//         const siteConfig = await this.getNewSiteConfig(context);

//         const azExtAzureUtils = await getAzExtAzureUtils();
//         const vscAzureAppService = await getAzExtAppService();

//         const location: AzExtLocation = await azExtAzureUtils.LocationListStep.getLocation(context);
//         const locationName: string = nonNullProp(location, 'name');

//         const client: WebSiteManagementClient = await vscAzureAppService.createWebSiteClient(context);
//         const siteEnvelope: Site = {
//             name: context.newSiteName,
//             location: locationName,
//             serverFarmId: nonNullValueAndProp(context.plan, 'id'),
//             siteConfig: siteConfig
//         };

//         if (context.customLocation) {
//             // deploying to Azure Arc
//             siteEnvelope.kind = 'app,linux,kubernetes,container';
//             await this.addCustomLocationProperties(siteEnvelope, context.customLocation);
//         } else {
//             siteEnvelope.identity = {
//                 type: 'SystemAssigned'
//             };
//         }

//         context.site = await client.webApps.beginCreateOrUpdateAndWait(nonNullValueAndProp(context.resourceGroup, 'name'), nonNullProp(context, 'newSiteName'), siteEnvelope);
//     }

//     private async getNewSiteConfig(context: IAppServiceContainerWizardContext): Promise<SiteConfig> {
//         const registryTI: UnifiedRegistryItem<unknown> = this.node.parent.parent;

//         let username: string | undefined;
//         let password: string | undefined;
//         let registryUrl: string | undefined;
//         const appSettings: NameValuePair[] = [];

//         // Scenarios:
//         // ACR -> App Service, NOT Arc App Service. Use managed service identity.
//         if (registryTI instanceof AzureRegistryTreeItem && !context.customLocation) {
//             appSettings.push({ name: 'DOCKER_ENABLE_CI', value: 'true' });

//             // Don't need an image, username, or password--just create an empty web app to assign permissions and then configure with an image
//             // `DockerAssignAcrPullRoleStep` handles it after that
//             return {
//                 acrUseManagedIdentityCreds: true,
//                 appSettings
//             };
//         }
//         // ACR -> Arc App Service. Use regular auth. Same as any V2 registry but different way of getting auth.
//         else if (registryTI instanceof AzureRegistryTreeItem && context.customLocation) {
//             const cred = await registryTI.tryGetAdminCredentials(context);
//             if (!cred?.username || !cred?.passwords?.[0]?.value) {
//                 throw new Error(l10n.t('Azure App service deployment on Azure Arc only supports running images from Azure Container Registries with admin enabled'));
//             }

//             username = cred.username;
//             password = cred.passwords[0].value;
//             registryUrl = registryTI.baseUrl;
//         }
//         // Docker Hub -> App Service *OR* Arc App Service
//         else if (registryTI instanceof DockerHubNamespaceTreeItem) {
//             username = registryTI.parent.username;
//             password = await registryTI.parent.getPassword();
//             registryUrl = 'https://index.docker.io';
//         }
//         // Generic registry -> App Service *OR* Arc App Service
//         else if (registryTI instanceof DockerV2RegistryTreeItemBase) {
//             if (registryTI instanceof GenericDockerV2RegistryTreeItem) {
//                 username = registryTI.cachedProvider.username;
//                 password = await getRegistryPassword(registryTI.cachedProvider);
//             } else {
//                 throw new RangeError(l10n.t('Unrecognized node type "{0}"', registryTI.constructor.name));
//             }

//             registryUrl = registryTI.baseUrl;
//         } else {
//             throw new RangeError(l10n.t('Unrecognized node type "{0}"', registryTI.constructor.name));
//         }

//         if (username && password) {
//             appSettings.push({ name: "DOCKER_REGISTRY_SERVER_USERNAME", value: username });
//             appSettings.push({ name: "DOCKER_REGISTRY_SERVER_PASSWORD", value: password });
//         }

//         if (registryUrl) {
//             appSettings.push({ name: 'DOCKER_REGISTRY_SERVER_URL', value: registryUrl });
//         }

//         if (context.webSitesPort) {
//             appSettings.push({ name: "WEBSITES_PORT", value: context.webSitesPort.toString() });
//         }

//         const linuxFxVersion = `DOCKER|${this.node.fullTag}`;
//         TODO: review this later
//         const linuxFxVersion = '';
//         return {
//             linuxFxVersion,
//             appSettings
//         };
//     }

//     private addCustomLocationProperties(site: Site, customLocation: CustomLocation): void {
//         site.extendedLocation = { name: customLocation.id, type: 'customLocation' };
//     }

//     public shouldExecute(context: IAppServiceContainerWizardContext): boolean {
//         return !context.site;
//     }
// }

// TODO: review this later
