/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { execAsync } from '../../utils/spawnAsync';

const composeCommandReplaceRegex = /(up|down).*$/i;

export async function getComposeServiceList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<string> {
    const services = await getServices(workspaceFolder, composeCommand);

    const pickChoices: IAzureQuickPickItem<string>[] = services.map(s => {
        return {
            label: s,
            data: s,
        };
    });

    // Fetch the previously chosen services list. By default, all will be selected.
    const workspaceServiceListKey = `vscode-docker.composeServices.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceServiceListKey, pickChoices.map(c => c.data));

    const subsetChoices =
        await ext.ui.showQuickPick(
            pickChoices,
            {
                isPickSelected: (item: vscode.QuickPickItem) => previousChoices.some(i => i === item.label), // `label` is the same as `data` so this is an OK comparison
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
