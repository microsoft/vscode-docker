/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Registry } from "azure-arm-containerregistry/lib/models";
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from "path";
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
            console.log(context.repositoryName);
            imageName = `${context.label} -a`; // Pull all images in repository
        } else {
            assert.fail(`Unexpected node type: ${context}`);
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

    // Check if user is logged into Docker and send appropriate commands to terminal
    const terminal = ext.terminalProvider.createTerminal("Docker");
    terminal.show();

    if (!isLoggedIntoDocker(registry)) {
        exec(`docker login ${registryName} -u ${username} -p ${password}`, (err, stdout, stderr) => {
            ext.outputChannel.append(stdout);
            ext.outputChannel.append(stderr);
        });
    }
    terminal.sendText(`docker pull ${registryName}/${imageName}`);
}

function isLoggedIntoDocker(registry: Registry): boolean {
    let home = process.env.HOMEPATH;
    let configPath: string = path.join(home, '.docker', 'config.json');
    let buffer: Buffer;
    try {
        buffer = fs.readFileSync(configPath);
    } catch (err) {
        return false; // If config.json is not found and not in the default location
    }

    let index = buffer.indexOf(registry.loginServer);
    return index !== -1; // Returns -1 if user is not logged into docker
}
