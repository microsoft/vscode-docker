/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { rewriteComposeCommandIfNeeded } from '../../docker/Contexts';
import { localize } from "../../localize";
import { executeAsTask } from '../../utils/executeAsTask';
import { createFileItem, Item, quickPickDockerComposeFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { selectComposeCommand } from '../selectCommandTemplate';
import { getComposeServiceList } from './getComposeServiceList';

async function compose(context: IActionContext, commands: ('up' | 'down' | 'upSubset')[], message: string, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    // If a file is chosen, get its workspace folder, otherwise, require the user to choose
    // If a file is chosen that is not in a workspace, it will automatically fall back to quickPickWorkspaceFolder
    const folder: vscode.WorkspaceFolder = (dockerComposeFileUri ? vscode.workspace.getWorkspaceFolder(dockerComposeFileUri) : undefined) ||
        await quickPickWorkspaceFolder(context, localize('vscode-docker.commands.compose.workspaceFolder', 'To run Docker compose you must first open a folder or workspace in VS Code.'));

    let commandParameterFileUris: vscode.Uri[];
    if (selectedComposeFileUris && selectedComposeFileUris.length) {
        commandParameterFileUris = selectedComposeFileUris;
    } else if (dockerComposeFileUri) {
        commandParameterFileUris = [dockerComposeFileUri];
    } else {
        commandParameterFileUris = [];
    }

    let selectedItems: Item[] = commandParameterFileUris.map(uri => createFileItem(folder, uri));
    if (!selectedItems.length) {
        // prompt for compose file
        const selectedItem = await quickPickDockerComposeFileItem(context, folder, message);
        selectedItems = selectedItem ? [selectedItem] : [];
    }

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const build: boolean = configOptions.get('dockerComposeBuild', true);
    const detached: boolean = configOptions.get('dockerComposeDetached', true);

    for (const command of commands) {
        if (selectedItems.length === 0) {
            // Push a dummy item in so that we can use the looping logic below
            selectedItems.push(undefined);
        }

        for (const item of selectedItems) {
            let terminalCommand = await selectComposeCommand(
                context,
                folder,
                command === 'down' ? 'down' : 'up',
                item?.relativeFilePath,
                detached,
                build
            );

            if (command === 'upSubset' && !serviceListPlaceholder.test(terminalCommand)) {
                // eslint-disable-next-line no-template-curly-in-string
                terminalCommand += ' ${serviceList}';
            }

            // Add the service list if needed
            terminalCommand = await addServicesListIfNeeded(context, folder, terminalCommand);

            // Rewrite for the new CLI if needed
            terminalCommand = await rewriteComposeCommandIfNeeded(terminalCommand);

            await executeAsTask(context, terminalCommand, 'Docker Compose', { addDockerEnv: true, workspaceFolder: folder });
        }
    }
}

export async function composeUp(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['up'], localize('vscode-docker.commands.compose.chooseUp', 'Choose Docker Compose file to bring up'), dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeUpSubset(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['upSubset'], localize('vscode-docker.commands.compose.chooseUpSubset', 'Choose Docker Compose file to bring up'), dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeDown(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['down'], localize('vscode-docker.commands.compose.chooseDown', 'Choose Docker Compose file to take down'), dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeRestart(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['down', 'up'], localize('vscode-docker.commands.compose.chooseRestart', 'Choose Docker Compose file to restart'), dockerComposeFileUri, selectedComposeFileUris);
}

const serviceListPlaceholder = /\${serviceList}/i;
async function addServicesListIfNeeded(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, command: string): Promise<string> {
    if (serviceListPlaceholder.test(command)) {
        return command.replace(serviceListPlaceholder, await getComposeServiceList(context, workspaceFolder, command));
    } else {
        return command;
    }
}
