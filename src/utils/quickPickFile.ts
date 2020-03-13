/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import vscode = require('vscode');
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { CSPROJ_GLOB_PATTERN, DOCKERFILE_GLOB_PATTERN, FILE_SEARCH_MAX_RESULT, FSPROJ_GLOB_PATTERN, YAML_GLOB_PATTERN } from "../constants";
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export interface Item extends vscode.QuickPickItem {
    relativeFilePath: string;
    relativeFolderPath: string;
    absoluteFilePath: string;
    absoluteFolderPath: string;
}

async function getFileUris(folder: vscode.WorkspaceFolder, globPattern: string): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, globPattern), undefined, FILE_SEARCH_MAX_RESULT, undefined);
}

function createFileItem(rootFolder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    let relativeFilePath = path.join(".", uri.fsPath.substr(rootFolder.uri.fsPath.length));

    return <Item>{
        description: undefined,
        relativeFilePath: relativeFilePath,
        label: relativeFilePath,
        relativeFolderPath: path.dirname(relativeFilePath),
        absoluteFilePath: uri.fsPath,
        absoluteFolderPath: rootFolder.uri.fsPath,
    };
}

async function resolveFileItemsInternal(rootFolder: vscode.WorkspaceFolder, fileUri: vscode.Uri | undefined, globPatterns: string[], message: string, canPickMany: boolean)
    : Promise<Item[] | undefined> {
    if (fileUri) {
        return [createFileItem(rootFolder, fileUri)];
    }

    let uris: vscode.Uri[] = [];
    await Promise.all(globPatterns.map(async (pattern: string) => {
        uris.push(...await getFileUris(rootFolder, pattern));
    }));
    // de-dupe
    uris = uris.filter((uri, index) => uris.findIndex(uri2 => uri.toString() === uri2.toString()) === index);

    if (!uris || uris.length === 0) {
        return undefined;
    } else {
        let items: Item[] = uris.map(uri => createFileItem(rootFolder, uri));
        if (items.length === 1) {
            return items;
        } else {
            return await ext.ui.showQuickPick<Item>(items, { placeHolder: message, canPickMany: true });
        }
    }
}

async function resolveFileItems(rootFolder: vscode.WorkspaceFolder, fileUri: vscode.Uri | undefined, globPatterns: string[], message: string): Promise<Item[] | undefined> {
    return await resolveFileItemsInternal(rootFolder, fileUri, globPatterns, message, true);
}

async function resolveFileItem(rootFolder: vscode.WorkspaceFolder, fileUri: vscode.Uri | undefined, globPatterns: string[], message: string): Promise<Item | undefined> {
    const res: Item[] | undefined = await resolveFileItemsInternal(rootFolder, fileUri, globPatterns, message, false);
    return res?.length > 0 ? res[0] : undefined;
}

export async function quickPickDockerFileItems(context: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder, message: string): Promise<Item[]> {
    const globPatterns: string[] = getDockerFileGlobPatterns();
    return await resolveFileItems(rootFolder, dockerFileUri, globPatterns, message);
}

export async function quickPickDockerFileItem(context: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder): Promise<Item> {
    let dockerFileItem: Item;
    const globPatterns: string[] = getDockerFileGlobPatterns();

    while (!dockerFileItem) {
        let resolvedItem: Item | undefined = await resolveFileItem(rootFolder, dockerFileUri, globPatterns, localize('vscode-docker.utils.quickPick.chooseDockerfile', 'Choose a Dockerfile to build.'));
        if (resolvedItem) {
            dockerFileItem = resolvedItem;
        } else {
            let msg = localize('vscode-docker.utils.quickPick.noDockerfile', 'Couldn\'t find a Dockerfile in your workspace. Would you like to add Docker files to the workspace?');
            context.telemetry.properties.cancelStep = msg;
            await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.cancel);
            context.telemetry.properties.cancelStep = undefined;
            await vscode.commands.executeCommand('vscode-docker.configure');
            // Try again
        }
    }
    return dockerFileItem;
}

function getDockerFileGlobPatterns(): string[] {
    const result: string[] = [DOCKERFILE_GLOB_PATTERN];
    try {
        const config = vscode.workspace.getConfiguration('files').get<{}>('associations');
        if (config) {
            for (const globPattern of Object.keys(config)) {
                const fileType = <string | undefined>config[globPattern];
                if (fileType && /^dockerfile$/i.test(fileType)) {
                    result.push(globPattern);
                }
            }
        }
    } catch {
        // ignore and use default
    }
    return result;
}

export async function quickPickYamlFileItem(fileUri: vscode.Uri, rootFolder: vscode.WorkspaceFolder, noYamlFileMessage: string): Promise<Item> {
    const fileItem: Item = await resolveFileItem(rootFolder, fileUri, [YAML_GLOB_PATTERN], localize('vscode-docker.utils.quickPick.chooseYaml', 'Choose a .yaml file to run.'));
    if (!fileItem) {
        throw new Error(noYamlFileMessage);
    }
    return fileItem;
}

export async function quickPickProjectFileItem(fileUri: vscode.Uri, rootFolder: vscode.WorkspaceFolder, noProjectFileMessage: string): Promise<Item> {
    const fileItem: Item = await resolveFileItem(rootFolder, fileUri, [CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN], localize('vscode-docker.utils.quickPick.chooseProject', 'Choose a project file.'));
    if (!fileItem) {
        throw new Error(noProjectFileMessage);
    }
    return fileItem;
}
