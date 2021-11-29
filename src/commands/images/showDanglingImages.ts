/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { IActionContext } from 'vscode-azureextensionui';

export async function showDanglingImages(context: IActionContext): Promise<void> {
    await vscode.commands.executeCommand('setContext', 'vscode-docker:danglingShown', true);
    await ext.context.globalState.update('vscode-docker.images.showDanglingImages', true);
}

export async function hideDanglingImages(context: IActionContext): Promise<void> {
    await vscode.commands.executeCommand('setContext', 'vscode-docker:danglingShown', false);
    await ext.context.globalState.update('vscode-docker.images.showDanglingImages', false);
}
