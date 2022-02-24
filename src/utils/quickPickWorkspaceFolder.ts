/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';
import { isMac } from './osUtils';

export async function quickPickWorkspaceFolder(context: IActionContext, noWorkspacesMessage: string): Promise<vscode.WorkspaceFolder> {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        return vscode.workspace.workspaceFolders[0];
    } else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
        const selected = await vscode.window.showWorkspaceFolderPick();
        if (!selected) {
            throw new UserCancelledError();
        }
        return selected;
    } else {
        context.errorHandling.suppressReportIssue = true;
        context.errorHandling.buttons = [
            {
                callback: async () => {
                    if (isMac()) {
                        // On Mac there's no separate "Open Folder" command, so need to just use the "Open" command
                        void vscode.commands.executeCommand('workbench.action.files.openFileFolder');
                    } else {
                        void vscode.commands.executeCommand('workbench.action.files.openFolder');
                    }
                },
                title: localize('vscode-docker.quickPickWorkspaceFolder.openFolder', 'Open Folder'),
            }
        ];
        throw new Error(noWorkspacesMessage);
    }
}
