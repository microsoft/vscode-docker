/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { extensionId } from '../constants';

export async function reportIssue(context: IActionContext): Promise<void> {
    return vscode.commands.executeCommand('vscode.openIssueReporter', `${extensionId}`);
}
