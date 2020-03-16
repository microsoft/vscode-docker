/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { dockerComposeHeader } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { captureCancelStep } from '../utils/captureCancelStep';
import { DockerfileInfo, parseDockerfile } from '../utils/dockerfileUtils';
import { getValidImageName } from '../utils/getValidImageName';
import { Item, quickPickDockerFileItems } from '../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { generateUniqueName } from '../utils/uniqueNameUtils';
import { getComposePorts } from './configure';
import { ConfigureTelemetryCancelStep } from './configUtils';
import { generateNonConflictFileNameWithPrompt, ScaffoldFile, writeFiles } from './scaffolding';

export interface ComposeScaffoldContext extends DockerfileInfo {
    serviceName: string
}

export async function configureCompose(context: IActionContext): Promise<void> {

    function captureStep<TReturn, TPrompt extends (...args: []) => Promise<TReturn>>(step: ConfigureTelemetryCancelStep, prompt: TPrompt): TPrompt {
        return captureCancelStep(step, context.telemetry.properties, prompt);
    }

    const telemetry = context.telemetry.properties;

    const uniqueServiceNames: string[] = [];
    let hasDuplicateService: boolean = false;
    function addToServiceNames(serviceName: string): void {
        if (uniqueServiceNames.includes(serviceName)) {
            hasDuplicateService = true;
        } else {
            uniqueServiceNames.push(serviceName);
        }
    }

    const rootFolder: vscode.WorkspaceFolder = await captureStep('folder', promptForFolder)();
    let composeFile: ScaffoldFile;

    // Get list of dockerfiles (services) to add to compose
    const dockerFiles: Item[] = await getDockerFilesInWorkspace(context, rootFolder);
    telemetry.serviceCount = dockerFiles ? dockerFiles.length.toString() : '0';
    telemetry.uniqueServiceCount = '0';

    // Add the services to docker-compose.yaml
    if (dockerFiles) {
        const composeScaffoldContexts: ComposeScaffoldContext[] = [];
        await Promise.all(
            dockerFiles.map(async dockerfile => {
                let serviceName = path.basename(path.dirname(dockerfile.absoluteFilePath));
                serviceName = getValidImageName(serviceName);
                const dockerfileInfo: DockerfileInfo = await parseDockerfile(rootFolder.uri.fsPath, dockerfile.absoluteFilePath);
                addToServiceNames(serviceName);
                composeScaffoldContexts.push({
                    ...dockerfileInfo,
                    serviceName: serviceName,
                });
            })
        );
        telemetry.uniqueServiceCount = uniqueServiceNames.length.toString();
        if (hasDuplicateService) {
            updateWithUniqueServiceName(composeScaffoldContexts, uniqueServiceNames);
        }
        composeFile = generateComposeFile(composeScaffoldContexts);
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
            context.serviceName = generateUniqueName(context.serviceName, existingNames, i => `${i}`);
            existingNames.push(context.serviceName);
        }
        processedServices.push(context.serviceName);
    })
}

async function promptForFolder(): Promise<vscode.WorkspaceFolder> {
    return await quickPickWorkspaceFolder(localize('vscode-docker.scaffolding.dockerCompose.noWorkspaceFolder', 'To generate docker-compose files you must first open a folder or workspace in VS Code.'));
}

async function getDockerFilesInWorkspace(context: IActionContext, rootFolder: vscode.WorkspaceFolder): Promise<Item[]> {
    const message = localize('vscode-docker.scaffolding.dockerCompose.selectDockerFiles', 'Choose Dockerfiles to include in docker-compose.')
    const items: Item[] = await quickPickDockerFileItems(context, undefined, rootFolder, message);
    return items;
}

function generateComposeFile(contexts: ComposeScaffoldContext[]): ScaffoldFile {
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
