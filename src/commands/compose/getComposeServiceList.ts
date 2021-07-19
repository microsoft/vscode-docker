/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { execAsync } from '../../utils/spawnAsync';

// Matches an `up` or `down` and everything after it--so that it can be replaced with `config --services`, to get a service list using all of the files originally part of the compose command
const composeCommandReplaceRegex = /(\b(up|down)\b).*$/i;

export async function getComposeServiceList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<string> {
    const services = await getServices(workspaceFolder, composeCommand);

    // Fetch the previously chosen services list. By default, all will be selected.
    const workspaceServiceListKey = `vscode-docker.composeServices.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceServiceListKey, services);

    const pickChoices: IAzureQuickPickItem<string>[] = services.map(s => ({
        label: s,
        data: s,
        picked: previousChoices.some(p => p === s),
    }));

    const subsetChoices =
        await context.ui.showQuickPick(
            pickChoices,
            {
                canPickMany: true,
                placeHolder: localize('vscode-docker.getComposeServiceList.choose', 'Choose services to start'),
            }
        );

    context.telemetry.measurements.totalServices = pickChoices.length;
    context.telemetry.measurements.chosenServices = subsetChoices.length;

    // Update the cache
    await ext.context.workspaceState.update(workspaceServiceListKey, subsetChoices.map(c => c.data));

    return subsetChoices.map(c => c.data).join(' ');
}

async function getServices(workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<string[]> {
    // Start by getting a new command with the exact same files list (replaces the "up ..." or "down ..." with "config --services")
    const configCommand = composeCommand.replace(composeCommandReplaceRegex, 'config --services');

    const { stdout } = await execAsync(configCommand, { cwd: workspaceFolder.uri.fsPath });

    // The output of the config command is a list of services, one per line
    // Split them up and remove empty entries
    return stdout.split(/\r?\n/im).filter(l => { return l; });
}
