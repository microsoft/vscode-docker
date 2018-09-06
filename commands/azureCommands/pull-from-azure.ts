/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Registry } from "azure-arm-containerregistry/lib/models";
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from "path";
import vscode = require('vscode');
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { AzureImageTagNode, AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import * as quickPicks from '../utils/quick-pick-azure';

/* Pulls an image from Azure. The context is the image node the user has right clicked on */
export async function pullFromAzure(context?: AzureImageTagNode | AzureRepositoryNode): Promise<any> {
    let registryName: string;
    let registry: Registry;
    let imageName: string;

    if (context) { // Right Click
        registryName = context.registry.loginServer;
        registry = context.registry;

        if (context instanceof AzureImageTagNode) { // Right Click on AzureImageNode
            imageName = context.label;
        } else if (context instanceof AzureRepositoryNode) { // Right Click on AzureRepositoryNode
            imageName = `${context.label} -a`; // Pull all images in repository
        } else {
            assert.fail(`Unexpected node type`);
        }

    } else { // Command Palette
        registry = await quickPicks.quickPickACRRegistry();
        registryName = registry.loginServer;
        const repository: Repository = await quickPicks.quickPickACRRepository(registry, 'Select the repository of the image you want to pull');
        const image: AzureImage = await quickPicks.quickPickACRImage(repository, 'Select the image you want to pull');
        imageName = `${repository.name}:${image.tag}`;
    }

    // Using loginCredentials function to get the username and password. This takes care of all users, even if they don't have the Azure CLI
    const credentials = await acrTools.getLoginCredentials(registry);
    const username = credentials.username;
    const password = credentials.password;
    pullImage(registryName, imageName, username, password);
}

async function pullImage(registryName: string, imageName: string, username: string, password: string): Promise<void> {
    const terminal = ext.terminalProvider.createTerminal("Docker");
    terminal.show();

    // Check if user is logged into Docker and send appropriate commands to terminal
    let result = await isLoggedIntoDocker(registryName);
    if (!result.loggedIn) { // If not logged into Docker
        let childProcess = exec(`docker login ${registryName} --username ${username} --password-stdin`, (err, stdout, stderr) => {
            ext.outputChannel.append(stdout);
            ext.outputChannel.append(stderr);
            if (err && err.message.includes("Error saving credentials: error storing credentials - err: exit status 1, out: `The stub received bad data.`")) { // Temporary fix for this error- same as Azure CLI
                vscode.window.showErrorMessage(`In order to login to Docker, go to \n${result.configPath} and remove "credsStore": "wincred" from the config.json file, then try again. \nThis operation will disable wincred and use the file system to store Docker credentials. All registries that are currently logged in will be logged out.`);
            } else {
                terminal.sendText(`docker pull ${registryName}/${imageName}`);
            }
        });
        childProcess.stdin.write(password); // Prevents insecure password error
        childProcess.stdin.end();
    } else {
        terminal.sendText(`docker pull ${registryName}/${imageName}`);
    }
}

async function isLoggedIntoDocker(registryName: string): Promise<{ configPath: string, loggedIn: boolean }> {
    let home = process.env.HOMEPATH;
    let configPath: string = path.join(home, '.docker', 'config.json');
    let buffer: Buffer;

    await callWithTelemetryAndErrorHandling('findDockerConfig', async function (this: IActionContext): Promise<void> {
        this.suppressTelemetry = true;
        buffer = fs.readFileSync(configPath);
    });

    let index = buffer.indexOf(registryName);
    let loggedIn = index >= 0; // Returns -1 if user is not logged into Docker
    return { configPath, loggedIn }; // Returns object with configuration path and boolean indicating if user was logged in or not
}
