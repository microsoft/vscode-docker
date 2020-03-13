/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from "path";
import * as vscode from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import { dockerComposeHeader } from "../constants";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { captureCancelStep } from '../utils/captureCancelStep';
import { DockerfileInfo, parseDockerfile } from "../utils/dockerfileUtils";
import { generateUniqueName } from '../utils/generateUniqueName';
import { Item, quickPickDockerFileItems } from "../utils/quickPickFile";
import { quickPickWorkspaceFolder } from "../utils/quickPickWorkspaceFolder";
import { getComposePorts } from "./configure";
import { ConfigureTelemetryCancelStep } from './configUtils';
import { generateNonConflictFileNameWithPrompt, ScaffoldFile, writeFiles } from "./scaffolding";

export interface ComposeScaffoldContext extends DockerfileInfo {
    serviceName: string
}

export async function configureCompose(context: IActionContext): Promise<void> {

    function captureStep<TReturn, TPrompt extends (...args: []) => Promise<TReturn>>(step: ConfigureTelemetryCancelStep, prompt: TPrompt): TPrompt {
        return captureCancelStep(step, context.telemetry.properties, prompt);
    }

    const serviceNames: string[] = [];
    let hasDuplicateService: boolean = false;
    function AddToServiceNames(serviceName: string): void {
        if (serviceNames.includes(serviceName)) {
            hasDuplicateService = true;
        } else {
            serviceNames.push(serviceName);
        }
    }

    const rootFolder: vscode.WorkspaceFolder = await captureStep('folder', promptForFolder)();
    let composeFile: ScaffoldFile;
    // Get list of dockerfiles (services) to add to compose
    const dockerFiles: Item[] = await getDockerFilesInWorkspace(context, rootFolder);

    // Add the services to docker-compose.yaml
    if (dockerFiles) {
        const composeScaffoldContexts: ComposeScaffoldContext[] = [];
        await Promise.all(
            dockerFiles.map(async dockerfile => {
                const serviceName = path.basename(path.dirname(dockerfile.absoluteFilePath));
                const dockerfileInfo: DockerfileInfo = await parseDockerfile(rootFolder.uri.fsPath, dockerfile.absoluteFilePath);
                AddToServiceNames(serviceName);
                composeScaffoldContexts.push({
                    ...dockerfileInfo,
                    serviceName: serviceName,
                });
            })
        );
        if (hasDuplicateService) {
            updateWithUniqueServiceName(composeScaffoldContexts, serviceNames);
        }
        composeFile = await generateComposeFiles(composeScaffoldContexts);
    } else {
        // No dockerfile is present in the workspace. Create a template docker-compose file.
        const templateComposeFile = path.join(ext.context.asAbsolutePath('resources'), 'template.docker-compose.yml');
        const composeContent = (await fse.readFile(templateComposeFile)).toString();
        composeFile = { fileName: 'docker-compose.yml', contents: composeContent }
    }
    composeFile.onConflict = async (filePath) => { return await generateNonConflictFileNameWithPrompt(filePath) };
    await writeFiles([composeFile], rootFolder.uri.fsPath);
}

function updateWithUniqueServiceName(contexts: ComposeScaffoldContext[], existingNames: string[]): void {
    const processedServices: string[] = [];
    contexts.map(context => {
        if (processedServices.includes(context.serviceName)) {
            context.serviceName = generateUniqueName(context.serviceName, existingNames, i => `.${i}`);
            existingNames.push(context.serviceName);
        }
        processedServices.push(context.serviceName);
    })
}

async function promptForFolder(): Promise<vscode.WorkspaceFolder> {
    return await quickPickWorkspaceFolder(localize('vscode-docker.scaffolding.dockerCompose', 'To generate docker-compose files you must first open a folder or workspace in VS Code.'));
}

async function getDockerFilesInWorkspace(context: IActionContext, rootFolder: vscode.WorkspaceFolder): Promise<Item[]> {
    const message = localize('vscode-docker.scaffolding.dockerCompose.selectDockerFiles', 'Choose Dockerfiles to include in docker-compose.')
    const items: Item[] = await quickPickDockerFileItems(context, undefined, rootFolder, message);
    return items;
}

async function generateComposeFiles(contexts: ComposeScaffoldContext[]): Promise<ScaffoldFile> {
    let services: string = '';
    contexts.forEach(context => {
        let ports: string = context.ports?.length > 0 ? `\n${getComposePorts(context.ports)}` : '';
        services += '\n' + `  ${context.serviceName}:
    image: ${context.serviceName}
    build:
      context: .
      dockerfile: ${context.dockerfileNameRelativeToRoot}${ports}`;
    });

    const composeContent = dockerComposeHeader + services;
    return { fileName: 'docker-compose.yml', contents: composeContent };
}
