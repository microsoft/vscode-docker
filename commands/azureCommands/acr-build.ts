import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { DockerBuildRequest } from "azure-arm-containerregistry/lib/models/dockerBuildRequest";
import { Registry } from 'azure-arm-containerregistry/lib/models/registry';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fs from 'fs';
import * as os from 'os';
import * as process from 'process';
import * as tar from 'tar';
import * as url from 'url';
import * as vscode from "vscode";
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { getBlobInfo, getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { resolveDockerFileItem } from '../build-image';
import { quickPickACRRegistry, quickPickNewImageName, quickPickSubscription } from '../utils/quick-pick-azure';

const idPrecision = 6;
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn'];
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
    const dockerItem = await resolveDockerFileItem(folder, dockerFileUri);
    const sourceLocation: string = folder.uri.path;
    const tarFilePath = getTempSourceArchivePath();

    const uploadedSourceLocation = await uploadSourceCode(client, registry.name, resourceGroupName, sourceLocation, tarFilePath, folder);
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

async function uploadSourceCode(client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, sourceLocation: string, tarFilePath: string, folder: vscode.WorkspaceFolder): Promise<string> {
    status.appendLine("   Sending source code to temp file");
    let source = sourceLocation.substring(1);
    let current = process.cwd();
    process.chdir(source);
    fs.readdir(source, (err, items) => {
        items = filter(items);
        tar.c(
            {},
            items
        ).pipe(fs.createWriteStream(tarFilePath));
        process.chdir(current);
    });

    status.appendLine("   Getting Build Source Upload Url ");
    let sourceUploadLocation = await client.registries.getBuildSourceUploadUrl(resourceGroupName, registryName);
    let upload_url = sourceUploadLocation.uploadUrl;
    let relative_path = sourceUploadLocation.relativePath;

    status.appendLine("   Getting blob info from Upload Url ");
    // Right now, accountName and endpointSuffix are unused, but will be used for streaming logs later.
    let { accountName, endpointSuffix, containerName, blobName, sasToken, host } = getBlobInfo(upload_url);
    status.appendLine("   Creating Blob Service ");
    let blob: BlobService = createBlobServiceWithSas(host, sasToken);
    status.appendLine("   Creating Block Blob ");
    blob.createBlockBlobFromLocalFile(containerName, blobName, tarFilePath, (): void => { });
    return relative_path;
}

function getTempSourceArchivePath(): string {
    /* tslint:disable-next-line:insecure-random */
    let id = Math.floor(Math.random() * Math.pow(10, idPrecision));
    status.appendLine("Setting up temp file with 'sourceArchive" + id + ".tar.gz' ");
    let tarFilePath = url.resolve(os.tmpdir(), `sourceArchive${id}.tar.gz`);
    return tarFilePath;
}

function filter(list: string[]): string[] {
    let result = [];
    for (let file of list) {
        if (vcsIgnoreList.indexOf(file) === -1) {
            result.push(file);
        }
    }
    return result;
}
