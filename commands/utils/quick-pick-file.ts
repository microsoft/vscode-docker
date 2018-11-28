/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import vscode = require('vscode');
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { DOCKERFILE_GLOB_PATTERN, YAML_GLOB_PATTERN } from '../../dockerExtension';
import { ext } from '../../extensionVariables';

export interface Item extends vscode.QuickPickItem {
    relativeFilePath: string;
    relativeFolderPath: string;
}

async function getFileUris(folder: vscode.WorkspaceFolder, globPattern: string): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, globPattern), undefined, 1000, undefined);
}

function createFileItem(rootFolder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    let relativeFilePath = path.join(".", uri.fsPath.substr(rootFolder.uri.fsPath.length));

    return <Item>{
        description: undefined,
        relativeFilePath: relativeFilePath,
        label: relativeFilePath,
        relativeFolderPath: path.dirname(relativeFilePath)
    };
}

export async function resolveFileItem(rootFolder: vscode.WorkspaceFolder, fileUri: vscode.Uri | undefined, globPattern: string, message: string): Promise<Item | undefined> {
    if (fileUri) {
        return createFileItem(rootFolder, fileUri);
    }

    let uris: vscode.Uri[] = await getFileUris(rootFolder, globPattern);

    if (!uris || uris.length === 0) {
        return undefined;
    } else {
        let items: Item[] = uris.map(uri => createFileItem(rootFolder, uri));
        if (items.length === 1) {
            return items[0];
        } else {
            const res: vscode.QuickPickItem = await ext.ui.showQuickPick(items, { placeHolder: message });
            return <Item>res;
        }
    }
}

export async function quickPickDockerFileItem(actionContext: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder): Promise<Item> {
    let dockerFileItem: Item;

    while (!dockerFileItem) {
        let resolvedItem: Item | undefined = await resolveFileItem(rootFolder, dockerFileUri, DOCKERFILE_GLOB_PATTERN, 'Choose a Dockerfile to build.');
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
    return dockerFileItem;
}

export async function quickPickYamlFileItem(fileUri: vscode.Uri, rootFolder: vscode.WorkspaceFolder, noYamlFileMessage: string): Promise<Item> {
    const fileItem: Item = await resolveFileItem(rootFolder, fileUri, YAML_GLOB_PATTERN, 'Choose a .yaml file to run.');
    if (!fileItem) {
        throw new Error(noYamlFileMessage);
    }
    return fileItem;
}
