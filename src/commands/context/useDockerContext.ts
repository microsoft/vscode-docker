/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { dockerContextManager } from '../../utils/dockerContextManager';
import { selectDockerContext } from './selectDockerContext';

export async function useDockerContext(_actionContext: IActionContext): Promise<void> {
    const selectedContext = await selectDockerContext(localize('vscode-docker.commands.context.selectContextToUse', 'Select Docker context to inspect'));

    await dockerContextManager.use(selectedContext.Name);

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.window.showInformationMessage(localize('vscode-docker.commands.context.contextInUse', 'Using Docker context \'{0}\'', selectedContext.Name));
}
