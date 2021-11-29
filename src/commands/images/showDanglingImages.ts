/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { IActionContext } from 'vscode-azureextensionui';

export const danglingImagesMementoKey = 'vscode-docker.images.showDanglingImages';
const danglingImagesContextKey = 'vscode-docker:danglingShown';

export async function showDanglingImages(context: IActionContext): Promise<void> {
    await setDanglingContextValue(true);
    await ext.context.globalState.update(danglingImagesMementoKey, true);
}

export async function hideDanglingImages(context: IActionContext): Promise<void> {
    await setDanglingContextValue(false);
    await ext.context.globalState.update(danglingImagesMementoKey, false);
}

export function setInitialDanglingContextValue(): void {
    void setDanglingContextValue(ext.context.globalState.get(danglingImagesMementoKey, false));
}

async function setDanglingContextValue(value: boolean): Promise<void> {
    return vscode.commands.executeCommand('setContext', danglingImagesContextKey, value);
}
