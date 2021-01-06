/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { localize } from '../localize';

export async function quickPickWorkspaceFolder(context: IActionContext, noWorkspacesMessage: string): Promise<vscode.WorkspaceFolder> {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        return vscode.workspace.workspaceFolders[0];
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
        let selected = await vscode.window.showWorkspaceFolderPick();
        if (!selected) {
            throw new UserCancelledError();
        }
        return selected;
    } else {
        context.errorHandling.suppressReportIssue = true;
        context.errorHandling.buttons = [
            {
                callback: async () => {
                    void vscode.commands.executeCommand('workbench.action.files.openFolder');
                },
                title: localize('vscode-docker.quickPickWorkspaceFolder.openFolder', 'Open Folder'),
            }
        ]
        throw new Error(noWorkspacesMessage);
    }
}
