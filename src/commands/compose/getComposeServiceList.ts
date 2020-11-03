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
    // Start by getting a new command with the exact same files list
    const configCommand = composeCommand.replace(composeCommandReplaceRegex, 'config --services');

    const { stdout } = await execAsync(configCommand, { cwd: workspaceFolder.uri.fsPath });

    // The output of the config command is a list of services, one per line
    // Split them up and remove empty entries
    const services = stdout.split(/\r?\n/im).filter(l => { return l; });

    const pickChoices: IAzureQuickPickItem<string>[] = services.map(s => {
        return {
            label: s,
            data: s,
        };
    })

    const choices = await ext.ui.showQuickPick(pickChoices, { canPickMany: true, placeHolder: localize('vscode-docker.getComposeServiceList.choose', 'Choose services to start') })
    return choices.map(c => c.data).join(' ');
}

