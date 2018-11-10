/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { UserCancelledError } from 'vscode-azureextensionui';

export async function quickPickWorkspaceFolder(noWorkspacesMessage: string): Promise<vscode.WorkspaceFolder> {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        return vscode.workspace.workspaceFolders[0];
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
        let selected = await vscode.window.showWorkspaceFolderPick();
        if (!selected) {
            throw new UserCancelledError();
        }
        return selected;
    } else {
        throw new Error(noWorkspacesMessage);
    }
}
