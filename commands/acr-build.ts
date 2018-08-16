import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry';
import { Registry } from 'azure-arm-containerregistry/lib/models';
import { QuickBuildRequest } from "azure-arm-containerregistry/lib/models";
import { ResourceManagementClient } from 'azure-arm-resource';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fs from 'fs';
import * as os from 'os';
import * as tar from 'tar';
import * as url from 'url';
import * as vscode from "vscode";
import { getBlobInfo } from "../utils/Azure/acrTools";
import { AzureUtilityManager } from "../utils/azureUtilityManager";
import { acquireResourceGroup, acquireSubscription, quickPickACRRegistry } from './utils/quick-pick-azure';
const idPrecision = 6;
let status = vscode.window.createOutputChannel('status');

// Prompts user to select a subscription, resource group, then registry from drop down. If there are multiple folders in the workspace, the source folder must also be selected.
// The user is then asked to name & tag the image. A build is queued for the image in the selected registry.
// Selected source code must contain a path to the desired dockerfile.
export async function queueBuild(dockerFileUri?: vscode.Uri): Promise<void> {
    status.show();
    status.appendLine("Obtaining Subscription and Client");
    let subscription = await acquireSubscription();
    let client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const resourceGroupClient = new ResourceManagementClient(AzureUtilityManager.getInstance().getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);

    let resourceGroup = await acquireResourceGroup(subscription, resourceGroupClient);
    let resourceGroupName = resourceGroup.name;

    let registry: Registry = await quickPickACRRegistry(subscription, resourceGroupName);
    let registryName = registry.name;

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
        relativeDockerPath = dockerFileUri.path.toString().substring(sourceLocation.length);
    }

    // Prompting for name so the image can then be pushed to a repository.
    const opt: vscode.InputBoxOptions = {
        prompt: 'Image name and tag in format  <name>:<tag>',
    };
    const name: string = await vscode.window.showInputBox(opt);

    let tarFilePath = getTempSourceArchivePath();

    status.appendLine("Uploading Source Code to " + tarFilePath);
    sourceLocation = await uploadSourceCode(client, registryName, resourceGroupName, sourceLocation, tarFilePath);

    let osType = os.type()
    if (osType === 'Windows_NT') {
        osType = 'Windows'
    }

    status.appendLine("Setting up Build Request");
    let buildRequest: QuickBuildRequest = {
        'type': 'QuickBuild',
        'imageNames': [name],
        'isPushEnabled': true,
        'sourceLocation': sourceLocation,
        'platform': { 'osType': osType },
        'dockerFilePath': relativeDockerPath
    };
    status.appendLine("Queueing Build");
    await client.registries.queueBuild(resourceGroupName, registryName, buildRequest);
    status.appendLine('Success');
}

async function uploadSourceCode(client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, sourceLocation: string, tarFilePath: string): Promise<string> {
    status.appendLine("   Sending source code to temp file");
    tar.c(
        {
            gzip: true
        },
        [sourceLocation]
    ).pipe(fs.createWriteStream(tarFilePath));

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

    status.appendLine("   Success ");
    return relative_path;
}

function getTempSourceArchivePath(): string {
    /* tslint:disable-next-line:insecure-random */
    let id = Math.floor(Math.random() * Math.pow(10, idPrecision));
    status.appendLine("Setting up temp file with 'sourceArchive" + id + ".tar.gz' ");
    let tarFilePath = url.resolve(os.tmpdir(), `sourceArchive${id}.tar.gz`);
    return tarFilePath;
}
