import * as vscode from 'vscode';
import * as path from 'path';
import * as ContainerInstanceModels from '../node_modules/azure-arm-containerinstance/lib/models';
import ContainerInstanceManagementClient = require('azure-arm-containerinstance');
import { SubscriptionModels } from 'azure-arm-resource';
import { AzureContainerGroupNode } from '../explorer/models/azureContainerInstanceNodes';
import { ServiceClientCredentials } from 'ms-rest';
import { AzureAccount, AzureSession } from '../typings/azure-account.api';
import { dockerExplorerProvider } from '../dockerExtension';

export async function deleteContainerInstance(azureAccount: AzureAccount, context: AzureContainerGroupNode) {
    const sub = context.subscription;
    const containerGroup = context.containerGroup;
    const session = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === sub.tenantId.toLowerCase());

    if (!session) {
        throw new Error(`Failed to get credentials, tenant ${sub.tenantId} not found.`);
    }

    const resourceGroup = /\/resourceGroups\/(\S+)\/providers\//i.exec(containerGroup.id)[1];
    const client = new ContainerInstanceManagementClient(session.credentials, sub.subscriptionId);

    await client.containerGroups.deleteMethod(resourceGroup, containerGroup.name);

    dockerExplorerProvider.refreshDeployments();
}