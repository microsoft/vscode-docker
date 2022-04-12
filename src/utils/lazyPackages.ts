/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';

export async function getArmAppSvc(): Promise<typeof import('@azure/arm-appservice')> {
    return await import('@azure/arm-appservice');
}

export async function getArmAuth(): Promise<typeof import('@azure/arm-authorization')> {
    return await import('@azure/arm-authorization');
}

export async function getArmContainerRegistry(): Promise<typeof import('@azure/arm-containerregistry')> {
    return await import('@azure/arm-containerregistry');
}

export async function getStorageBlob(): Promise<typeof import('@azure/storage-blob')> {
    return await import('@azure/storage-blob');
}

export async function getHandlebars(): Promise<typeof import('handlebars')> {
    return await import('handlebars');
}

// This file is really most important for these next two functions, which ensure that the extension variables are registered before the package is used

export async function getAzExtAzureUtils(): Promise<typeof import('@microsoft/vscode-azext-azureutils')> {
    const azExtAzureUtils = await import('@microsoft/vscode-azext-azureutils');
    azExtAzureUtils.registerAzureUtilsExtensionVariables(ext);
    return azExtAzureUtils;
}

export async function getAzExtAppService(): Promise<typeof import('@microsoft/vscode-azext-azureappservice')> {
    const appSvc = await import('@microsoft/vscode-azext-azureappservice');
    appSvc.registerAppServiceExtensionVariables(ext);
    return appSvc;
}

// These are internal but we want to load them lazily

export async function getAzActTreeItem(): Promise<typeof import('../tree/registries/azure/AzureAccountTreeItem')> {
    return await import('../tree/registries/azure/AzureAccountTreeItem');
}

export async function getAzSubTreeItem(): Promise<typeof import('../tree/registries/azure/SubscriptionTreeItem')> {
    return await import('../tree/registries/azure/SubscriptionTreeItem');
}

export async function getDockerodeClient(): Promise<typeof import('../docker/DockerodeApiClient/DockerodeApiClient')> {
    return await import('../docker/DockerodeApiClient/DockerodeApiClient');
}

export async function getDockerServeClient(): Promise<typeof import('../docker/DockerServeClient/DockerServeClient')> {
    return await import('../docker/DockerServeClient/DockerServeClient');
}
