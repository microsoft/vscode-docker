import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { BuildGetLogResult, QuickBuildRequest } from "azure-arm-containerregistry/lib/models";
import { Build, Registry } from 'azure-arm-containerregistry/lib/models';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { Readable, Writable } from 'stream';
import * as tar from 'tar';
import * as url from 'url';
import * as vscode from "vscode";
import { ResourceGroup } from '../../node_modules/azure-arm-resource/lib/resource/models';
import { getBlobInfo, getResourceGroupName } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickResourceGroup, quickPickSubscription } from '../utils/quick-pick-azure';
const idPrecision = 6;
const status = vscode.window.createOutputChannel('status');
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn'];
// Prompts user to select a subscription, resource group, then registry from drop down. If there are multiple folders in the workspace, the source folder must also be selected.
// The user is then asked to name & tag the image. A build is queued for the image in the selected registry.
// Selected source code must contain a path to the desired dockerfile.
export async function queueBuild(dockerFileUri?: vscode.Uri): Promise<void> {
    status.show();
    status.appendLine("Obtaining Subscription and initializing management client");
    const subscription = await quickPickSubscription();
    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const registry: Registry = await quickPickACRRegistry(true);
    status.appendLine("Selected registry: " + registry.name);

    const resourceGroupName = getResourceGroupName(registry);
    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }
    let sourceLocation: string = folder.uri.path;
    let relativeDockerPath = 'Dockerfile';
    if (dockerFileUri.path.indexOf(sourceLocation) !== 0) {
        //Currently, there is no support for selecting source location folders that don't contain a path to the triggered dockerfile.
        throw new Error("Source code path must be a parent of the Dockerfile path");
    } else {
        relativeDockerPath = dockerFileUri.path.toString().substring(sourceLocation.length + 1);
    }

    // Prompting for name so the image can then be pushed to a repository.
    const opt: vscode.InputBoxOptions = {
        prompt: 'Image name and tag in format  <name>:<tag>',
    };
    const name: string = await vscode.window.showInputBox(opt);

    let tarFilePath = getTempSourceArchivePath();

    status.appendLine("Uploading Source Code to " + tarFilePath);
    let uploadedSourceLocation = await uploadSourceCode(client, registry.name, resourceGroupName, sourceLocation, tarFilePath, folder);

    let osType = os.type()
    if (osType === 'Windows_NT') {
        osType = 'Windows'
    }
    status.appendLine("Setting up Build Request");
    console.log(dockerFileUri.path.substring(4));
    let buildRequest: QuickBuildRequest = {
        'type': 'QuickBuild',
        'imageNames': [name],
        'isPushEnabled': true,
        'sourceLocation': uploadedSourceLocation,
        'platform': { 'osType': 'Linux' },
        'dockerFilePath': 'Dockerfile' //relativeDockerPath
    };
    status.appendLine("Queueing Build");
    await client.registries.queueBuild(resourceGroupName, registry.name, buildRequest);
    status.appendLine('Success');
}

async function uploadSourceCode(client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, sourceLocation: string, tarFilePath: string, folder: vscode.WorkspaceFolder): Promise<string> {
    status.appendLine("   Sending source code to temp file");
    let source = sourceLocation.substring(1);
    process.chdir(source);
    await fs.readdir(source, (err, items) => {
        items = filter(items);
        tar.c(
            {},
            items
        ).pipe(fs.createWriteStream(tarFilePath));
        process.chdir(current);
    });
    let current = process.cwd();

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
    for (let file of list) {
        if (vcsIgnoreList.indexOf(file) !== -1) {
            list.splice(list.indexOf(file), 1);
        }
    }
    return list;
}

async function streamLogs(client: ContainerRegistryManagementClient, resourceGroupName: string, registry: Registry, build: Build): Promise<void> {
    const temp: BuildGetLogResult = await client.builds.getLogLink(resourceGroupName, registry.name, build.buildId);
    const link = temp.logLink;
    let blobInfo = getBlobInfo(link);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    let stream: Readable = new Readable();
    try {
        stream = blob.createReadStream(blobInfo.containerName, blobInfo.blobName, (error, response) => {
            if (response) {
                console.log(response.name + 'has Completed');
            } else {
                console.log(error);
            }
        });
        console.log(stream);
    } catch (error) {
        console.log('a' + error);
    }
    stream.on('data', (chunk) => {
        status.appendLine(chunk.toString());
        status.show();
    });

}

async function streamLogs2(client: ContainerRegistryManagementClient, resourceGroupName: string, registry: Registry, build: Build): Promise<void> {
    const temp: BuildGetLogResult = await client.builds.getLogLink(resourceGroupName, registry.name, build.buildId);
    const link = temp.logLink;
    let blobInfo = getBlobInfo(link);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    let stream: Readable = blob.createReadStream(blobInfo.containerName, blobInfo.blobName, (error, response) => {
        if (response) {
            status.appendLine(response.name + 'has Completed');
        } else {
            status.appendLine(error.message);
        }
        status.show();
    });

    stream.on('data', (chunk) => {
        status.appendLine(chunk.toString());
        console.log(chunk.toString());
        status.show();
    });

}

export async function streamLogs3(client: ContainerRegistryManagementClient, resourceGroupName: string, registry: Registry, build: Build): Promise<void> {
    const temp: BuildGetLogResult = await client.builds.getLogLink(resourceGroupName, registry.name, build.buildId);
    return new Promise<void>((resolve, reject) => {
        const link = temp.logLink;
        let blobInfo = getBlobInfo(link);
        let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
        let stream: Readable = new Readable();
        stream = blob.createReadStream(blobInfo.containerName, blobInfo.blobName, (error, response) => {
            if (response) {
                //.appendLine(chunk.toString());
                status.show();
            } else {
                status.appendLine(error.message);
                reject();
            }
            status.show();
        });

        stream.on('data', (chunk) => {
            status.appendLine(chunk.toString());
            status.show();
        });
        stream.on('finish', () => {
            resolve();
        });

    });
}
