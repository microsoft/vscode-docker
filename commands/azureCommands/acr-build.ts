import { DockerBuildRequest } from "azure-arm-containerregistry/lib/models/dockerBuildRequest";
import { Registry } from 'azure-arm-containerregistry/lib/models/registry';
import * as vscode from "vscode";
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { FileType, resolveFileItem } from '../build-image';
import { quickPickACRRegistry, quickPickNewImageName, quickPickSubscription } from '../utils/quick-pick-azure';
import { getTempSourceArchivePath, uploadSourceCode } from '../utils/SourceArchiveUtility';

const status = vscode.window.createOutputChannel('ACR Build status');

// Prompts user to select a subscription, resource group, then registry from drop down. If there are multiple folders in the workspace, the source folder must also be selected.
// The user is then asked to name & tag the image. A build is queued for the image in the selected registry.
// Selected source code must contain a path to the desired dockerfile.
export async function queueBuild(dockerFileUri?: vscode.Uri): Promise<void> {
    //Acquire information from user
    const subscription = await quickPickSubscription();

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const registry: Registry = await quickPickACRRegistry(true);

    const resourceGroupName = getResourceGroupName(registry);

    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;

    const imageName: string = await quickPickNewImageName();

    //Begin readying build
    status.show();

    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }
    const dockerItem = await resolveFileItem(folder, dockerFileUri, FileType.Dockerfile);
    const sourceLocation: string = folder.uri.path;
    const tarFilePath = getTempSourceArchivePath(status);

    const uploadedSourceLocation = await uploadSourceCode(status, client, registry.name, resourceGroupName, sourceLocation, tarFilePath, folder);
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

    const run = await client.registries.scheduleRun(resourceGroupName, registry.name, runRequest);
    status.appendLine("Schedule Run " + run.runId);

    streamLogs(registry, run, status, client);
}
