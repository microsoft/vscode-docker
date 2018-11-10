import { ContainerRegistryManagementClient } from 'azure-arm-containerregistry/lib/containerRegistryManagementClient';
import { BlobService, createBlobServiceWithSas } from "azure-storage";
import * as fse from 'fs-extra';
import * as os from 'os';
import * as tar from 'tar';
import * as url from 'url';
import vscode = require('vscode');
import { getBlobInfo } from "../../utils/Azure/acrTools";

const idPrecision = 6;
const vcsIgnoreList = ['.git', '.gitignore', '.bzr', 'bzrignore', '.hg', '.hgignore', '.svn']

export async function uploadSourceCode(status: vscode.OutputChannel, client: ContainerRegistryManagementClient, registryName: string, resourceGroupName: string, rootFolder: vscode.WorkspaceFolder, tarFilePath: string): Promise<string> {
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

export function getTempSourceArchivePath(status: vscode.OutputChannel): string {
    /* tslint:disable-next-line:insecure-random */
    let id: number = Math.floor(Math.random() * Math.pow(10, idPrecision));
    status.appendLine("Setting up temp file with 'sourceArchive" + id + ".tar.gz' ");
    let tarFilePath: string = url.resolve(os.tmpdir(), `sourceArchive${id}.tar.gz`);
    return tarFilePath;
}
