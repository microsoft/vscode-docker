/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { InputBoxOptions } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { wrapDockerodeENOENT } from '../../utils/wrapError';

export async function createNetwork(_context: IActionContext): Promise<void> {

    const opts: InputBoxOptions = {
        value: '',
        prompt: 'Name of the network'
    };
    const name = await ext.ui.showInputBox(opts)

    const result = <{ id: string }>await wrapDockerodeENOENT(() => ext.dockerode.createNetwork({ Name: name }));

    window.showInformationMessage(`Network Created with ID ${result.id}`);
}
