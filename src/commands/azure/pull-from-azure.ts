/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Registry } from "azure-arm-containerregistry/lib/models";
import { exec } from 'child_process';
import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { AzureImageTagNode, AzureRepositoryNode } from '../../../explorer/models/azureRegistryNodes';
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import { quickPickACRImage, quickPickACRRegistry, quickPickACRRepository } from '../../utils/quick-pick-azure';

export async function pullRepoFromAzure(_context: IActionContext, node?: AzureRepositoryNode): Promise<void> {
    await pullFromAzure(node, true);
}

export async function pullImageFromAzure(_context: IActionContext, node?: AzureImageTagNode): Promise<void> {
    await pullFromAzure(node, false);
}

/* Pulls an image from Azure. The context is the image node the user has right clicked on */
async function pullFromAzure(node: AzureImageTagNode | AzureRepositoryNode, pullAll: boolean): Promise<void> {
    let registry: Registry;
    let imageRequest: string;

    if (node) { // Right Click
        registry = node.registry;

        if (node instanceof AzureImageTagNode) { // Right Click on AzureImageNode
            imageRequest = node.label;
        } else if (node instanceof AzureRepositoryNode) { // Right Click on AzureRepositoryNode
            imageRequest = `${node.label} -a`; // Pull all images in repository
        } else {
            assert.fail(`Unexpected node type`);
        }

    } else { // Command Palette
        registry = await quickPickACRRegistry();
        const repository: Repository = await quickPickACRRepository(registry, 'Select the repository of the image you want to pull.');
        if (pullAll) {
            imageRequest = `${repository.name} -a`;
        } else {
            const image: AzureImage = await quickPickACRImage(repository, 'Select the image you want to pull');
            imageRequest = image.toString();
        }
    }

    // Using loginCredentials function to get the username and password. This takes care of all users, even if they don't have the Azure CLI
    const { username, password } = await acrTools.getLoginCredentials(registry);
    await pullImage(registry.loginServer, imageRequest, username, password);
}

async function pullImage(loginServer: string, imageRequest: string, username: string, password: string): Promise<void> {
    // We can't know if the key is still active. So we login into Docker and send appropriate commands to terminal
    await new Promise((resolve, reject) => {
        const dockerLoginCmd = `docker login ${loginServer} --username ${username} --password-stdin`;
        let childProcess = exec(dockerLoginCmd, (err, stdout, stderr) => {
            ext.outputChannel.append(`${dockerLoginCmd} xxxxxx\n`);
            ext.outputChannel.append(stdout);
            ext.outputChannel.append(stderr);
            if (err && err.message.match(/error storing credentials.*The stub received bad data/)) {
                // Temporary work-around for this error- same as Azure CLI
                // See https://github.com/Azure/azure-cli/issues/4843
                ext.outputChannel.show();
                reject(new Error(`In order to log in to the Docker CLI using tokens, you currently need to go to \nOpen your Docker config file and remove "credsStore": "wincred" from the config.json file, then try again. \nDoing this will disable wincred and cause Docker to store credentials directly in the .docker/config.json file. All registries that are currently logged in will be effectly logged out.`));
            } else if (err) {
                ext.outputChannel.show();
                reject(err);
            } else if (stderr) {
                ext.outputChannel.show();
                reject(stderr);
            }

            resolve();
        });

        childProcess.stdin.write(password); // Prevents insecure password error
        childProcess.stdin.end();
    });

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal("docker pull");
    terminal.show();

    terminal.sendText(`docker pull ${loginServer}/${imageRequest}`);
}
