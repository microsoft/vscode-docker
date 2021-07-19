/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../extensionVariables';
import { IActionContext } from 'vscode-azureextensionui';

export async function showDanglingImages(context: IActionContext): Promise<void> {
    const conf: boolean = ext.context.globalState.get('vscode-docker.images.showDanglingImages', false);
    await ext.context.globalState.update('vscode-docker.images.showDanglingImages', !conf);
}
