/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getDockerOSType } from '../../utils/osUtils';

export async function createNetwork(context: IActionContext): Promise<void> {

    const name = await context.ui.showInputBox({
        value: '',
        prompt: localize('vscode-docker.commands.networks.create.promptName', 'Name of the network')
    });

    const osType = await getDockerOSType();

    const drivers: { label: string }[] = osType === 'windows'
        ? [
            { label: 'nat' },
            { label: 'transparent' }
        ]
        : [
            { label: 'bridge' },
            { label: 'host' },
            { label: 'macvlan' }
        ];

    const driverSelection = await context.ui.showQuickPick(
        drivers,
        {
            canPickMany: false,
            placeHolder: localize('vscode-docker.commands.networks.create.promptDriver', 'Select the network driver to use (default is "bridge").')
        }
    );

    await ext.runWithDefaultShell(client =>
        client.createNetwork({ name: name, driver: driverSelection.label })
    );
}
