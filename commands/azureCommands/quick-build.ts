import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { DockerBuildRequest } from "azure-arm-containerregistry/lib/models";
import { Registry, Run } from 'azure-arm-containerregistry/lib/models';
import { Subscription } from 'azure-arm-resource/lib/subscription/models';
import * as fse from 'fs-extra';
import * as vscode from "vscode";
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { Item } from '../build-image';
import { quickPickACRRegistry, quickPickSubscription } from '../utils/quick-pick-azure';
import { quickPickDockerFileItem, quickPickImageName } from '../utils/quick-pick-image';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { getTempSourceArchivePath, uploadSourceCode } from '../utils/SourceArchiveUtility';

const status = vscode.window.createOutputChannel('ACR Build Status');

// Prompts user to select a subscription, resource group, then registry from drop down. If there are multiple folders in the workspace, the source folder must also be selected.
// The user is then asked to name & tag the image. A build is queued for the image in the selected registry.
// Selected source code must contain a path to the desired dockerfile.
export async function quickBuild(actionContext: IActionContext, dockerFileUri?: vscode.Uri | undefined): Promise<void> {
    //Acquire information from user
    let rootFolder: vscode.WorkspaceFolder = await quickPickWorkspaceFolder("To quick build Docker files you must first open a folder or workspace in VS Code.");
    const dockerItem: Item = await quickPickDockerFileItem(actionContext, dockerFileUri, rootFolder);
    const subscription: Subscription = await quickPickSubscription();
    const registry: Registry = await quickPickACRRegistry(true);
    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;
    const imageName: string = await quickPickImageName(actionContext, rootFolder, dockerItem);

    const resourceGroupName: string = getResourceGroupName(registry);
    const tarFilePath: string = getTempSourceArchivePath(status);
    const client: ContainerRegistryManagementClient = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);

    //Begin readying build
    status.show();

    const uploadedSourceLocation: string = await uploadSourceCode(status, client, registry.name, resourceGroupName, rootFolder, tarFilePath);
    status.appendLine("Uploaded Source Code to " + tarFilePath);

    const runRequest: DockerBuildRequest = {
        type: 'DockerBuildRequest',
        imageNames: [imageName],
        isPushEnabled: true,
        sourceLocation: uploadedSourceLocation,
        platform: { os: osType },
        dockerFilePath: dockerItem.relativeFilePath
    };
    status.appendLine("Set up Run Request");

    const run: Run = await client.registries.scheduleRun(resourceGroupName, registry.name, runRequest);
    status.appendLine("Scheduled Run " + run.runId);

    await streamLogs(registry, run, status, client);
    await fse.unlink(tarFilePath);
}
