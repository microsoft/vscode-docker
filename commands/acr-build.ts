import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { QuickBuildRequest } from "azure-arm-containerregistry/lib/models";
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as vscode from "vscode";
import { ImageNode } from "../explorer/models/imageNode";
import { AzureCredentialsManager } from "../utils/AzureCredentialsManager";
let tar = require('tar');
let fs = require('fs');
let os = require('os');
let url = require('url');

export async function queueBuild(context?: ImageNode): Promise<void> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Resource Group? '
    };
    const resourceGroup: string = await vscode.window.showInputBox(opt);
    opt = {
        ignoreFocusOut: true,
        prompt: 'Registry name? '
    };
    const registryName: string = await vscode.window.showInputBox(opt);

    console.log("Obtaining Subscription and Client");
    let subscription = AzureCredentialsManager.getInstance().getFilteredSubscriptionList()[0];
    let client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);

    console.log("Setting up temp file with 'sourceArchive.tar.gz' ");
    let tarFilePath = url.resolve(os.tmpdir(), 'sourceArchive.tar.gz');

    console.log("Uploading Source Code");
    let sourceLocation: string = vscode.workspace.rootPath;
    sourceLocation = await uploadSourceCode(client, registryName, resourceGroup, sourceLocation, tarFilePath);

    console.log("Setting up Build Request");
    let buildRequest: QuickBuildRequest = {
        'type': 'QuickBuild',
        'imageNames': [],
        'isPushEnabled': false,
        'sourceLocation': sourceLocation,
        'platform': { 'osType': 'Linux' },
        'dockerFilePath': 'DockerFile'
    };

    console.log("Queueing Build");
    try {
        await client.registries.queueBuild(resourceGroup, registryName, buildRequest);
    } catch (error) {
        console.log(error.message);
    }
    console.log(client.builds.list(resourceGroup, registryName));
}

async function uploadSourceCode(client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, sourceLocation: string, tarFilePath: string): Promise<string> {
    console.log("   Sending source code to temp file");
    try {
        tar.c(
            {
                gzip: true
            },
            [sourceLocation]
        ).pipe(fs.createWriteStream(tarFilePath));
    } catch (error) {
        console.log(error);
    }

    console.log("   Getting Build Source Upload Url ");
    let sourceUploadLocation = await client.registries.getBuildSourceUploadUrl(resourceGroupName, registryName);
    let upload_url = sourceUploadLocation.uploadUrl;
    let relative_path = sourceUploadLocation.relativePath;

    console.log("   Getting blob info from upload URl ");
    // Right now, accountName and endpointSuffix are unused, but will be used for streaming logs later.
    let { accountName, endpointSuffix, containerName, blobName, sasToken, host } = getBlobInfo(upload_url);

    console.log("   Creating Blob service ");
    let blob: BlobService = createBlobServiceWithSas(host, sasToken);

    console.log("   Creating Block Blob ");
    try {
        blob.createBlockBlobFromLocalFile(containerName, blobName, tarFilePath, (): void => { });
    } catch (error) {
        console.log(error);
    }
    console.log("   Success ");
    return relative_path;
}

function getBlobInfo(blobUrl: string): { accountName: string, endpointSuffix: string, containerName: string, blobName: string, sasToken: string, host: string } {
    let items: string[] = blobUrl.slice(blobUrl.search('https://') + 'https://'.length).split('/');
    let accountName: string = blobUrl.slice(blobUrl.search('https://') + 'https://'.length, blobUrl.search('.blob'));
    let endpointSuffix: string = items[0].slice(items[0].search('.blob.') + '.blob.'.length);
    let containerName: string = items[1];
    let blobName: string = items[2] + '/' + items[3] + '/' + items[4].slice(0, items[4].search('[?]'));
    let sasToken: string = items[4].slice(items[4].search('[?]') + 1);
    let host: string = accountName + '.blob.' + endpointSuffix;
    return { accountName, endpointSuffix, containerName, blobName, sasToken, host };
}
