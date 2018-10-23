import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fs from 'fs';
import * as os from 'os';
import * as tar from 'tar';
import * as url from 'url';
import vscode = require('vscode');
import { getBlobInfo } from "../../utils/Azure/acrTools";

const idPrecision = 6;
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn']

export async function uploadSourceCode(status: vscode.OutputChannel, client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, sourceLocation: string, tarFilePath: string, folder: vscode.WorkspaceFolder): Promise<string> {
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
    status.appendLine("Uploaded Source Code to " + tarFilePath);
    return relative_path;
}

export function getTempSourceArchivePath(status: vscode.OutputChannel): string {
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
