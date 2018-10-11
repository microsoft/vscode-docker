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
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { UserCancelledError } from '../../explorer/deploy/wizard';
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
    // Check if user is logged into Docker and send appropriate commands to terminal
    let result = await isLoggedIntoDocker(registryName);
    if (!result.loggedIn) { // If not logged in to Docker
        let login: vscode.MessageItem = { title: 'Log in to Docker CLI' };
        let msg = `You are not currently logged in to "${registryName}" in the Docker CLI.`;
        let response = await vscode.window.showErrorMessage(msg, login)
        if (response !== login) {
            throw new UserCancelledError(msg);
        }

        await new Promise((resolve, reject) => {
            let childProcess = exec(`docker login ${registryName} --username ${username} --password-stdin`, (err, stdout, stderr) => {
                ext.outputChannel.append(stdout);
                ext.outputChannel.append(stderr);
                if (err && err.message.match(/error storing credentials.*The stub received bad data/)) {
                    // Temporary work-around for this error- same as Azure CLI
                    // See https://github.com/Azure/azure-cli/issues/4843
                    reject(new Error(`In order to log in to the Docker CLI using tokens, you currently need to go to \n${result.configPath} and remove "credsStore": "wincred" from the config.json file, then try again. \nDoing this will disable wincred and cause Docker to store credentials directly in the .docker/config.json file. All registries that are currently logged in will be effectly logged out.`));
                } else if (err) {
                    reject(err);
                } else if (stderr) {
                    reject(stderr);
                }

                resolve();
            });

            childProcess.stdin.write(password); // Prevents insecure password error
            childProcess.stdin.end();
        });
    }

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal("docker pull");
    terminal.show();

    terminal.sendText(`docker pull ${registryName}/${imageName}`);
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
