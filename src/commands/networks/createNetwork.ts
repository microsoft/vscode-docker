/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { callDockerodeAsync, callDockerodeWithErrorHandling } from '../../utils/callDockerode';

export async function createNetwork(context: IActionContext): Promise<void> {

    const name = await ext.ui.showInputBox({
        value: '',
        prompt: localize('vscode-docker.commands.networks.create.promptName', 'Name of the network')
    });

    const engineVersion = await callDockerodeAsync(async () => ext.dockerode.version());
    const drivers = engineVersion.Os === 'windows'
        ? [
            { label: 'nat' },
            { label: 'transparent' }
        ]
        : [
            { label: 'bridge' },
            { label: 'host' },
            { label: 'macvlan' }
        ];

    const driverSelection = await ext.ui.showQuickPick(
        drivers,
        {
            canPickMany: false,
            placeHolder: localize('vscode-docker.commands.networks.create.promptDriver', 'Select the network driver to use (default is "bridge").')
        }
    );

    const result = <{ id: string }>await callDockerodeWithErrorHandling(async () => ext.dockerode.createNetwork({ Name: name, Driver: driverSelection.label }), context);

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(localize('vscode-docker.commands.networks.create.created', 'Network Created with ID {0}', result.id.substr(0, 12)));
}
