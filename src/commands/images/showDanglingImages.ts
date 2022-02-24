/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';

export const danglingImagesMementoKey = 'vscode-docker.images.showDanglingImages';
const danglingImagesContextKey = 'vscode-docker:danglingShown';

export async function showDanglingImages(context: IActionContext): Promise<void> {
    await ext.context.globalState.update(danglingImagesMementoKey, true);
    setDanglingContextValue(true);
    void ext.imagesTree.refresh(context);
}

export async function hideDanglingImages(context: IActionContext): Promise<void> {
    await ext.context.globalState.update(danglingImagesMementoKey, false);
    setDanglingContextValue(false);
    void ext.imagesTree.refresh(context);
}

export function setInitialDanglingContextValue(): void {
    setDanglingContextValue(ext.context.globalState.get(danglingImagesMementoKey, false));
}

function setDanglingContextValue(value: boolean): void {
    void vscode.commands.executeCommand('setContext', danglingImagesContextKey, value);
}
