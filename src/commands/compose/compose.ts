/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { localize } from "../../localize";
import { executeAsTask } from '../../utils/executeAsTask';
import { Item, createFileItem, quickPickDockerComposeFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { selectComposeCommand } from '../selectCommandTemplate';
import { getComposeProfileList, getComposeProfilesOrServices, getComposeServiceList } from './getComposeSubsetList';

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
                command,
                item?.relativeFilePath,
                detached,
                build
            );

            // Add the service list if needed
            terminalCommand = await addServicesOrProfilesIfNeeded(context, folder, terminalCommand);

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
const profileListPlaceholder = /\${profileList}/i;
async function addServicesOrProfilesIfNeeded(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, command: string): Promise<string> {
    const commandWithoutPlaceholders = command.replace(serviceListPlaceholder, '').replace(profileListPlaceholder, '');
    if (serviceListPlaceholder.test(command) && profileListPlaceholder.test(command)) {
        // If both are present, need to ask
        const { services, profiles } = await getComposeProfilesOrServices(context, workspaceFolder, commandWithoutPlaceholders);
        return command
            .replace(serviceListPlaceholder, services)
            .replace(profileListPlaceholder, profiles);
    } else if (serviceListPlaceholder.test(command)) {
        return command.replace(serviceListPlaceholder, await getComposeServiceList(context, workspaceFolder, commandWithoutPlaceholders));
    } else if (profileListPlaceholder.test(command)) {
        return command.replace(profileListPlaceholder, await getComposeProfileList(context, workspaceFolder, commandWithoutPlaceholders));
    } else {
        return command;
    }
}
