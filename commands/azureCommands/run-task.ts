import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { FileTaskRunRequest } from "azure-arm-containerregistry/lib/models/fileTaskRunRequest";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fs from 'fs';
import * as os from 'os';
import * as tar from 'tar';
import * as url from 'url';
import vscode = require('vscode');
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { TaskNode } from "../../explorer/models/taskNode";
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { getBlobInfo, getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { resolveFileItem } from '../build-image';
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';

const idPrecision = 6;
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn']
const status = vscode.window.createOutputChannel('Run ACR Task status');

export async function runTask(context?: TaskNode): Promise<any> {
    let taskName: string;
    let subscription: Subscription;
    let resourceGroup: ResourceGroup;
    let registry: Registry;

    if (context) { // Right Click
        subscription = context.subscription;
        registry = context.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        taskName = context.task.name;
    } else { // Command Palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry();
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        taskName = (await quickPickTask(registry, subscription, resourceGroup)).name;
    }

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let runRequest: TaskRunRequest = {
        type: 'TaskRunRequest',
        taskName: taskName
    };

    try {
        let taskRun = await client.registries.scheduleRun(resourceGroup.name, registry.name, runRequest);
        vscode.window.showInformationMessage(`Successfully ran the Task: ${taskName} with ID: ${taskRun.runId}`);
    } catch (err) {
        ext.outputChannel.append(err);
        vscode.window.showErrorMessage(`Failed to ran the Task: ${taskName}`);
    }
}

// Runs the selected yaml file. Equivalent to az acr run -f <yaml file> <directory>
// Selected source code must contain a path to the desired dockerfile.
export async function runTaskFile(yamlFileUri?: vscode.Uri): Promise<void> {
    //Acquire information from user
    const subscription = await quickPickSubscription();

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const registry: Registry = await quickPickACRRegistry(true);

    const resourceGroupName = getResourceGroupName(registry);

    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;

    //Begin readying build
    status.show();

    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }
    const yamlItem = await resolveFileItem(folder, yamlFileUri, "Yaml");
    const sourceLocation: string = folder.uri.path;
    const tarFilePath = getTempSourceArchivePath();

    const uploadedSourceLocation = await uploadSourceCode(client, registry.name, resourceGroupName, sourceLocation, tarFilePath, folder);
    status.appendLine("Uploaded Source Code to " + tarFilePath);

    const runRequest: FileTaskRunRequest = {
        type: 'FileTaskRunRequest',
        taskFilePath: yamlItem.relativeFilePath,
        //valuesFilePath: yamlItem.relativeFolderPath,
        sourceLocation: uploadedSourceLocation,
        platform: { os: osType }
    };

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
