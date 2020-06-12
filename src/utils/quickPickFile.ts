/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import vscode = require('vscode');
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { COMPOSE_FILE_GLOB_PATTERN, CSPROJ_GLOB_PATTERN, DOCKERFILE_GLOB_PATTERN, FILE_SEARCH_MAX_RESULT, FSPROJ_GLOB_PATTERN, YAML_GLOB_PATTERN } from "../constants";
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

export function createFileItem(rootFolder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
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

function getDockerFileGlobPatterns(): string[] {
    return getGlobPatterns([DOCKERFILE_GLOB_PATTERN], /^dockerfile$/i);
}

function getDockerComposeFileGlobPatterns(): string[] {
    return getGlobPatterns([COMPOSE_FILE_GLOB_PATTERN], /^yaml$/i);
}

function getGlobPatterns(globPatterns: string[], fileTypeRegEx: RegExp): string[] {
    const result: string[] = globPatterns;
    try {
        const config = vscode.workspace.getConfiguration('files').get<unknown>('associations');
        if (config) {
            for (const globPattern of Object.keys(config)) {
                const fileType = <string | undefined>config[globPattern];
                if (fileType && fileTypeRegEx.test(fileType)) {
                    result.push(globPattern);
                }
            }
        }
    } catch {
        // ignore and use default
    }
    return result;
}

async function resolveFilesOfPattern(rootFolder: vscode.WorkspaceFolder, filePatterns: string[])
    : Promise<Item[] | undefined> {
    let uris: vscode.Uri[] = [];
    await Promise.all(filePatterns.map(async (pattern: string) => {
        uris.push(...await getFileUris(rootFolder, pattern));
    }));
    // de-dupe
    uris = uris.filter((uri, index) => uris.findIndex(uri2 => uri.toString() === uri2.toString()) === index);

    if (!uris || uris.length === 0) {
        return undefined;
    } else {
        return uris.map(uri => createFileItem(rootFolder, uri));
    }
}

async function quickPickFileItem(items: Item[], message: string): Promise<Item | undefined> {
    if (items) {
        if (items.length === 1) {
            return items[0];
        } else {
            return await ext.ui.showQuickPick<Item>(items, { placeHolder: message });
        }
    }
}

async function quickPickFileItems(items: Item[], message: string): Promise<Item[] | undefined> {
    if (items) {
        if (items.length === 1) {
            return items;
        } else {
            return await ext.ui.showQuickPick<Item>(items, { placeHolder: message, canPickMany: true });
        }
    }
}

export async function quickPickDockerFileItems(context: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder, message: string): Promise<Item[]> {
    if (dockerFileUri) {
        return [createFileItem(rootFolder, dockerFileUri)];
    }
    const globPatterns: string[] = getDockerFileGlobPatterns();
    const dockerFiles: Item[] | undefined = await resolveFilesOfPattern(rootFolder, globPatterns);
    return await quickPickFileItems(dockerFiles, message);
}

export async function quickPickDockerFileItem(context: IActionContext, dockerFileUri: vscode.Uri | undefined, rootFolder: vscode.WorkspaceFolder): Promise<Item> {
    if (dockerFileUri) {
        return createFileItem(rootFolder, dockerFileUri);
    }

    let selectedDockerFile: Item;
    const globPatterns: string[] = getDockerFileGlobPatterns();

    while (!selectedDockerFile) {
        const dockerFiles: Item[] | undefined = await resolveFilesOfPattern(rootFolder, globPatterns);
        const message = localize('vscode-docker.utils.quickPick.chooseDockerfile', 'Choose a Dockerfile to build.');
        selectedDockerFile = await quickPickFileItem(dockerFiles, message);
        if (!selectedDockerFile) {
            let msg = localize('vscode-docker.utils.quickPick.noDockerfile', 'Couldn\'t find a Dockerfile in your workspace. Would you like to add Docker files to the workspace?');
            context.telemetry.properties.cancelStep = msg;
            await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.cancel);
            context.telemetry.properties.cancelStep = undefined;
            await vscode.commands.executeCommand('vscode-docker.configure');
            // Try again
        }
    }
    return selectedDockerFile;
}

export async function quickPickDockerComposeFileItem(context: IActionContext, rootFolder: vscode.WorkspaceFolder, message: string): Promise<Item | undefined> {
    let selectedComposeFile: Item;
    const globPatterns: string[] = getDockerComposeFileGlobPatterns();

    while (!selectedComposeFile) {
        const composeFiles: Item[] | undefined = await resolveFilesOfPattern(rootFolder, globPatterns);
        if (composeFiles) {
            if ((composeFiles.length === 1 && isDefaultDockerComposeFile(composeFiles[0].label))
                || (composeFiles.length === 2 && composeFiles.some(i => isDefaultDockerComposeFile(i.label)) && composeFiles.some(i => isDefaultDockerComposeOverrideFile(i.label)))) {
                // if the current set of docker files contain only docker-compose.yml or docker-compose.yml with override file,
                // don't ask user for a docker file and let docker-compose automatically pick these files.
                return undefined;
            } else {
                selectedComposeFile = await quickPickFileItem(composeFiles, message);
            }
        } else {
            let msg = localize('vscode-docker.utils.quickPick.noComposefile', 'Couldn\'t find any docker-compose files in your workspace. Would you like to add Docker files to the workspace?');
            context.telemetry.properties.cancelStep = msg;
            await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.cancel);
            context.telemetry.properties.cancelStep = undefined;
            await vscode.commands.executeCommand('vscode-docker.configureCompose');
            // Try again
        }
    }
    return selectedComposeFile;
}

function isDefaultDockerComposeFile(fileName: string): boolean {
    if (fileName) {
        const lowerCasefileName: string = fileName.toLowerCase();
        return lowerCasefileName === 'docker-compose.yml' || lowerCasefileName === 'docker-compose.yaml'
    }

    return false;
}

function isDefaultDockerComposeOverrideFile(fileName: string): boolean {
    if (fileName) {
        const lowerCasefileName: string = fileName.toLowerCase();
        return lowerCasefileName === 'docker-compose.override.yml' || lowerCasefileName === 'docker-compose.override.yaml'
    }

    return false;
}

export async function quickPickYamlFileItem(fileUri: vscode.Uri, rootFolder: vscode.WorkspaceFolder, noYamlFileMessage: string): Promise<Item> {
    if (fileUri) {
        return createFileItem(rootFolder, fileUri);
    }

    const items: Item[] = await resolveFilesOfPattern(rootFolder, [YAML_GLOB_PATTERN]);
    const fileItem: Item = await quickPickFileItem(items, localize('vscode-docker.utils.quickPick.chooseYaml', 'Choose a .yaml file to run.'));

    if (!fileItem) {
        throw new Error(noYamlFileMessage);
    }
    return fileItem;
}

export async function quickPickProjectFileItem(fileUri: vscode.Uri, rootFolder: vscode.WorkspaceFolder, noProjectFileMessage: string): Promise<Item> {
    if (fileUri) {
        return createFileItem(rootFolder, fileUri);
    }

    const items: Item[] = await resolveFilesOfPattern(rootFolder, [CSPROJ_GLOB_PATTERN, FSPROJ_GLOB_PATTERN]);
    const fileItem: Item = await quickPickFileItem(items, localize('vscode-docker.utils.quickPick.chooseProject', 'Choose a project file.'));

    if (!fileItem) {
        throw new Error(noProjectFileMessage);
    }
    return fileItem;
}
