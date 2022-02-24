/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { FileTreeItem } from '../../../tree/containers/files/FileTreeItem';
import { multiSelectNodes } from '../../../utils/multiSelectNodes';
import { getCancelPromise } from '../../../utils/promiseUtils';

export async function openContainerFile(context: IActionContext, node?: FileTreeItem, nodes?: FileTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, noItemFoundErrorMessage: localize('vscode-docker.commands.containers.files.openContainerFile.noFiles', 'No files are available to open.') },
        ext.containersTree,
        'containerFile',
        node,
        nodes
    );

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localize('vscode-docker.commands.containers.files.openContainerFile.opening', 'Opening File(s)...'),
            cancellable: true
        },
        async (task, token) => {
            const filesPromise = Promise.all(
                nodes.map(
                    async n => {
                        const document = await vscode.workspace.openTextDocument(n.uri.uri);

                        if (token.isCancellationRequested) {
                            return;
                        }

                        // NOTE: If only a single file is opened, use "preview mode" which replaces the document with next opened (the default for opening files in VS Code).
                        //       If multiple files are opened, do not use preview mode so that each document will be shown (otherwise only the last would only be shown).
                        await vscode.window.showTextDocument(document, { preview: nodes.length === 1 });
                    }
                )
            );

            await Promise.race([filesPromise, getCancelPromise(token)]);
        });
}
