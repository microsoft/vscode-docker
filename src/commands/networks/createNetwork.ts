/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { wrapDockerodeENOENT } from '../../utils/wrapDockerodeENOENT';

export async function createNetwork(_context: IActionContext): Promise<void> {

    const name = await ext.ui.showInputBox({
        value: '',
        prompt: 'Name of the network'
    });

    const driverSelection = await ext.ui.showQuickPick(
        [
            { label: 'bridge' },
            { label: 'host' },
            { label: 'overlay' },
            { label: 'macvlan' }
        ],
        {
            canPickMany: false,
            placeHolder: 'Select the network driver to use (default is "bridge").'
        }
    );

    const result = <{ id: string }>await wrapDockerodeENOENT(() => ext.dockerode.createNetwork({ Name: name, Driver: driverSelection.label }));

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(`Network Created with ID ${result.id.substr(0, 12)}`);
}
