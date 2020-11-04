/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { executeAsTask } from '../../utils/executeAsTask';
import { createFileItem, Item, quickPickDockerComposeFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { selectComposeCommand } from '../selectCommandTemplate';
import { getComposeServiceList } from './getComposeServiceList';

async function compose(context: IActionContext, commands: ('up' | 'down')[], message: string, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    const folder: vscode.WorkspaceFolder = await quickPickWorkspaceFolder(localize('vscode-docker.commands.compose.workspaceFolder', 'To run Docker compose you must first open a folder or workspace in VS Code.'));

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
            // Get the initial command
            let terminalCommand = await selectComposeCommand(
                context,
                folder,
                command,
                undefined,
                detached,
                build
            );

            // Add the service list if needed
            terminalCommand = await addServicesListIfNeeded(context, folder, terminalCommand);

            // Rewrite for the new CLI if needed
            terminalCommand = await rewriteCommandForNewCliIfNeeded(terminalCommand);

            await executeAsTask(context, terminalCommand, 'Docker Compose', { addDockerEnv: true, workspaceFolder: folder });
        } else {
            for (const item of selectedItems) {
                let terminalCommand = await selectComposeCommand(
                    context,
                    folder,
                    command,
                    item.relativeFilePath,
                    detached,
                    build
                );

                // Add the service list if needed
                terminalCommand = await addServicesListIfNeeded(context, folder, terminalCommand);

                // Rewrite for the new CLI if needed
                terminalCommand = await rewriteCommandForNewCliIfNeeded(terminalCommand);

                await executeAsTask(context, terminalCommand, 'Docker Compose', { addDockerEnv: true, workspaceFolder: folder });
            }
        }
    }
}

export async function composeUp(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['up'], localize('vscode-docker.commands.compose.chooseUp', 'Choose Docker Compose file to bring up'), dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeDown(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['down'], localize('vscode-docker.commands.compose.chooseDown', 'Choose Docker Compose file to take down'), dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeRestart(context: IActionContext, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(context, ['down', 'up'], localize('vscode-docker.commands.compose.chooseRestart', 'Choose Docker Compose file to restart'), dockerComposeFileUri, selectedComposeFileUris);
}

// Exported for compose group down/restart commands
export async function rewriteCommandForNewCliIfNeeded(command: string): Promise<string> {
    if ((await ext.dockerContextManager.getCurrentContext()).Type === 'aci') {
        // Replace 'docker-compose ' at the start of a string with 'docker compose ', and '--build' anywhere with ''
        return command.replace(/^docker-compose /, 'docker compose ').replace(/--build/, '');
    } else {
        return command;
    }
}

const serviceListPlaceholder = /\${serviceList}/i;
async function addServicesListIfNeeded(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, command: string): Promise<string> {
    if (serviceListPlaceholder.test(command)) {
        return command.replace(serviceListPlaceholder, await getComposeServiceList(context, workspaceFolder, command));
    } else {
        return command;
    }
}
