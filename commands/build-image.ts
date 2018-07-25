/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as vscode from "vscode";
import { DialogResponses, IActionContext, UserCancelledError } from "vscode-azureextensionui";
import { DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';
import { delay } from "../explorer/utils/utils";
import { ext } from "../extensionVariables";
import { addImageTaggingTelemetry, getTagFromUserInput } from "./tag-image";

async function getDockerFileUris(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, DOCKERFILE_GLOB_PATTERN), undefined, 1000, undefined);
}

interface Item extends vscode.QuickPickItem {
    relativeFilePath: string;
    relativeFolderPath: string;
}

function createDockerfileItem(rootFolder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    let relativeFilePath = path.join(".", uri.fsPath.substr(rootFolder.uri.fsPath.length));

    return <Item>{
        description: undefined,
        relativeFilePath: relativeFilePath,
        label: relativeFilePath,
        relativeFolderPath: path.dirname(relativeFilePath)
    };
}

export async function resolveDockerFileItem(rootFolder: vscode.WorkspaceFolder, dockerFileUri: vscode.Uri | undefined): Promise<Item | undefined> {
    if (dockerFileUri) {
        return createDockerfileItem(rootFolder, dockerFileUri);
    }

    const uris: vscode.Uri[] = await getDockerFileUris(rootFolder);

    if (!uris || uris.length === 0) {
        return undefined;
    } else {
        let items: Item[] = uris.map(uri => createDockerfileItem(rootFolder, uri));
        if (items.length === 1) {
            return items[0];
        } else {
            const res: vscode.QuickPickItem = await ext.ui.showQuickPick(items, { placeHolder: 'Choose Dockerfile to build' });
            return <Item>res;
        }
    }
}

export async function buildImage(actionContext: IActionContext, dockerFileUri: vscode.Uri | undefined): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultContextPath = configOptions.get('imageBuildContextPath', '');
    let dockerFileItem: Item | undefined;

    let rootFolder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        rootFolder = vscode.workspace.workspaceFolders[0];
    } else {
        let selected = await vscode.window.showWorkspaceFolderPick();
        if (!selected) {
            throw new UserCancelledError();
        }
        rootFolder = selected;
    }

    if (!rootFolder) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Docker files can only be built if VS Code is opened on a folder.');
        } else {
            vscode.window.showErrorMessage('Docker files can only be built if a workspace folder is picked in VS Code.');
        }
        return;
    }

    while (!dockerFileItem) {
        let resolvedItem: Item | undefined = await resolveDockerFileItem(rootFolder, dockerFileUri);
        if (resolvedItem) {
            dockerFileItem = resolvedItem;
        } else {
            let msg = "Couldn't find a Dockerfile in your workspace. Would you like to add Docker files to the workspace?";
            actionContext.properties.cancelStep = msg;
            await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.cancel);
            actionContext.properties.cancelStep = undefined;
            await vscode.commands.executeCommand('vscode-docker.configure');
            // Try again
        }
    }

    let contextPath: string = dockerFileItem.relativeFolderPath;
    if (defaultContextPath && defaultContextPath !== '') {
        contextPath = defaultContextPath;
    }
    let absFilePath: string = path.join(rootFolder.uri.fsPath, dockerFileItem.relativeFilePath);
    let dockerFileKey = `buildTag_${absFilePath}`;
    let prevImageName: string | undefined = ext.context.globalState.get(dockerFileKey);
    let suggestedImageName: string;

    if (!prevImageName) {
        // Get imageName based on name of subfolder containing the Dockerfile, or else workspacefolder
        suggestedImageName = path.basename(dockerFileItem.relativeFolderPath).toLowerCase();
        if (suggestedImageName === '.') {
            suggestedImageName = path.basename(rootFolder.uri.fsPath).toLowerCase();
        }

        suggestedImageName += ":latest"
    } else {
        suggestedImageName = prevImageName;
    }

    // Temporary work-around for vscode bug where valueSelection can be messed up if a quick pick is followed by a showInputBox
    await delay(500);

    addImageTaggingTelemetry(actionContext, suggestedImageName, '.before');
    const imageName: string = await getTagFromUserInput(suggestedImageName, !prevImageName);
    addImageTaggingTelemetry(actionContext, imageName, '.after');

    await ext.context.globalState.update(dockerFileKey, imageName);

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Docker');
    terminal.sendText(`docker build --rm -f "${dockerFileItem.relativeFilePath}" -t ${imageName} ${contextPath}`);
    terminal.show();
}
