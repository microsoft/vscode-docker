/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { FileTreeItem } from '../../../tree/containers/files/FileTreeItem';
import { multiSelectNodes } from '../../../utils/multiSelectNodes';

async function fileExists(file: vscode.Uri): Promise<boolean> {
    try {
        // NOTE: The expectation is that stat() throws when the file does not exist.
        //       Filed https://github.com/microsoft/vscode/issues/112107 to provide
        //       a better mechanism than trapping exceptions.
        await vscode.workspace.fs.stat(file);

        return true;
    } catch {
        return false;
    }
}

const overwriteFile: vscode.MessageItem = {
    title: vscode.l10n.t('Overwrite File')
};

const skipFile: vscode.MessageItem = {
    title: vscode.l10n.t('Skip File')
};

const cancelDownload: vscode.MessageItem = {
    title: vscode.l10n.t('Cancel')
};

export async function downloadContainerFile(context: IActionContext, node?: FileTreeItem, nodes?: FileTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: vscode.l10n.t('No files are available to download.') },
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
            openLabel: vscode.l10n.t('Select'),
            title: vscode.l10n.t('Select folder for download')
        });

    if (localFolderUris === undefined || localFolderUris.length === 0) {
        throw new UserCancelledError();
    }

    const localFolderUri = localFolderUris[0];

    const files = nodes.map(n => {
        const containerFileUri = n.uri;
        const fileName = path.posix.basename(containerFileUri.path);

        return {
            containerUri: n.uri.uri,
            fileName,
            localUri: vscode.Uri.joinPath(localFolderUri, fileName)
        };
    });

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Downloading File(s)...'),
            cancellable: true
        },
        async (task, token) => {
            for (const file of files) {
                if (token.isCancellationRequested) {
                    throw new UserCancelledError();
                }

                const localFileExists = await fileExists(file.localUri);

                if (localFileExists) {
                    const result = await vscode.window.showWarningMessage(
                        vscode.l10n.t('The file \'{0}\' already exists in folder \'{1}\'.', file.fileName, localFolderUri.fsPath),
                        overwriteFile,
                        skipFile,
                        cancelDownload);

                    if (result === skipFile) {
                        continue;
                    } else if (result !== overwriteFile) {
                        throw new UserCancelledError();
                    }
                }

                await vscode.workspace.fs.copy(file.containerUri, file.localUri, { overwrite: true });
            }
        });
}
