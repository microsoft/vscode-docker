import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { DockerBuildRequest, FileTaskRunRequest, Registry } from 'azure-arm-containerregistry/lib/models';
import { Subscription } from 'azure-arm-resource/lib/subscription/models';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fse from 'fs-extra';
import * as os from 'os';
import * as tar from 'tar';
import * as url from 'url';
import vscode = require('vscode');
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { getBlobInfo, getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { Item } from '../build-image';
import { quickPickACRRegistry, quickPickSubscription } from './quick-pick-azure';
import { quickPickDockerFileItem, quickPickImageName, quickPickYamlFileItem } from './quick-pick-image';
import { quickPickWorkspaceFolder } from './quickPickWorkspaceFolder';

const idPrecision = 6;
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn']
const status1 = vscode.window.createOutputChannel('Scheduled ACR Run');

export type runRequestType =
    | 'DockerBuildRequest'
    | 'FileTaskRunRequest';

export async function scheduleRunRequest(fileUri: vscode.Uri, requestType: runRequestType, actionContext?: IActionContext): Promise<void> {
    //Acquire information.
    let rootFolder: vscode.WorkspaceFolder;
    let fileItem: Item;
    if (requestType === 'DockerBuildRequest') {
        rootFolder = await quickPickWorkspaceFolder("To quick build Docker files you must first open a folder or workspace in VS Code.");
        fileItem = await quickPickDockerFileItem(actionContext, fileUri, rootFolder);
    } else if (requestType === 'FileTaskRunRequest') {
        rootFolder = await quickPickWorkspaceFolder("To run a task from a Yaml file you must first open a folder or workspace in VS Code.");
        fileItem = await quickPickYamlFileItem(fileUri, rootFolder);
    } else {
        throw new Error("Run Request Type Currently not supported.");
    }
    const subscription: Subscription = await quickPickSubscription();
    const registry: Registry = await quickPickACRRegistry(true);
    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;

    const resourceGroupName: string = getResourceGroupName(registry);
    const tarFilePath: string = getTempSourceArchivePath(status1);
    const client: ContainerRegistryManagementClient = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);

    //Prepare to run.
    status1.show();

    const uploadedSourceLocation: string = await uploadSourceCode(status1, client, registry.name, resourceGroupName, rootFolder, tarFilePath);
    status1.appendLine("Uploaded Source Code to " + tarFilePath);

    let runRequest: DockerBuildRequest | FileTaskRunRequest;
    if (requestType === 'DockerBuildRequest') {
        const imageName: string = await quickPickImageName(actionContext, rootFolder, fileItem);
        runRequest = {
            type: requestType,
            imageNames: [imageName],
            isPushEnabled: true,
            sourceLocation: uploadedSourceLocation,
            platform: { os: osType },
            dockerFilePath: fileItem.relativeFilePath
        };
    } else {
        runRequest = {
            type: 'FileTaskRunRequest',
            taskFilePath: fileItem.relativeFilePath,
            sourceLocation: uploadedSourceLocation,
            platform: { os: osType }
        }
    }

    //Schedule the run and Clean up.
    status1.appendLine("Set up Run Request");

    const run = await client.registries.scheduleRun(resourceGroupName, registry.name, runRequest);
    status1.appendLine("Scheduled Run " + run.runId);

    await streamLogs(registry, run, status1, client);
    await fse.unlink(tarFilePath);
}

async function uploadSourceCode(status: vscode.OutputChannel, client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, rootFolder: vscode.WorkspaceFolder, tarFilePath: string): Promise<string> {
    status.appendLine("   Sending source code to temp file");
    let source: string = rootFolder.uri.fsPath;
    let items = await fse.readdir(source);
    items = items.filter(i => !(i in vcsIgnoreList));
    // tslint:disable-next-line:no-unsafe-any
    tar.c({ cwd: source }, items).pipe(fse.createWriteStream(tarFilePath));

    status.appendLine("   Getting Build Source Upload Url ");
    let sourceUploadLocation = await client.registries.getBuildSourceUploadUrl(resourceGroupName, registryName);
    let upload_url: string = sourceUploadLocation.uploadUrl;
    let relative_path: string = sourceUploadLocation.relativePath;

    status.appendLine("   Getting blob info from Upload Url ");
    // Right now, accountName and endpointSuffix are unused, but will be used for streaming logs later.
    let blobInfo = getBlobInfo(upload_url);
    status.appendLine("   Creating Blob Service ");
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    status.appendLine("   Creating Block Blob ");
    blob.createBlockBlobFromLocalFile(blobInfo.containerName, blobInfo.blobName, tarFilePath, (): void => { });
    return relative_path;
}

function getTempSourceArchivePath(status: vscode.OutputChannel): string {
    /* tslint:disable-next-line:insecure-random */
    let id: number = Math.floor(Math.random() * Math.pow(10, idPrecision));
    status.appendLine("Setting up temp file with 'sourceArchive" + id + ".tar.gz' ");
    let tarFilePath: string = url.resolve(os.tmpdir(), `sourceArchive${id}.tar.gz`);
    return tarFilePath;
}
