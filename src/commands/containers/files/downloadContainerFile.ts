/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { FileTreeItem } from '../../../tree/containers/files/FileTreeItem';
import { multiSelectNodes } from '../../../utils/multiSelectNodes';

export async function downloadContainerFile(context: IActionContext, node?: FileTreeItem, nodes?: FileTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.containers.files.downloadContainerFile.noFiles', 'No files are available to download.') },
        ext.containersTree,
        'containerFile',
        node,
        nodes
    );

    const localFolderUris = await vscode.window.showOpenDialog(
        {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: localize('vscode-docker.commands.containers.files.downloadContainerFile.openLabel', 'Select'),
            title: localize('vscode-docker.commands.containers.files.downloadContainerFile.openTitle', 'Select folder for download')
        });

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localize('vscode-docker.commands.containers.files.downloadContainerFile.opening', 'Downloading File(s)...')
        },
        async () => {
            await Promise.all(
                nodes.map(
                    async n => {
                        const containerFileUri = node.uri;
                        const filePath = containerFileUri.path;
                        const fileName = path.posix.basename(filePath);
                        const localFileUri = vscode.Uri.joinPath(localFolderUris[0], fileName);

                        const content = await vscode.workspace.fs.readFile(containerFileUri.uri);

                        await vscode.workspace.fs.writeFile(localFileUri, content);
                    }));
        });
}
