/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from "azure-arm-containerregistry/lib/models";
import { exec } from 'child_process';
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

        if (context.contextValue === "azureImageTagNode") { // Right Click on AzureImageNode
            imageName = context.label;
        } else { // Right Click on AzureRepositoryNode
            console.log(context.repositoryName);
            imageName = `${context.label} -a`; // Pull all images in repository
        }

    } else { // Command Palette
        registry = await quickPicks.quickPickACRRegistry();
        registryName = registry.loginServer;
        const repository: Repository = await quickPicks.quickPickACRRepository(registry, 'Select the repository of the image you want to pull');
        const image: AzureImage = await quickPicks.quickPickACRImage(repository, 'Select the image you want to pull');
        imageName = `${repository.name}:${image.tag}`;
    }

    // Using loginCredentials function to get the username and password. This takes care of all users, even if they don't have the Azure CLI
    const credentials = await acrTools.loginCredentials(registry);
    const username = credentials.username;
    const password = credentials.password;

    // Send commands to terminal
    const terminal = ext.terminalProvider.createTerminal("Docker");
    terminal.show();
    let cont = (err, stdout, stderr) => {
        ext.outputChannel.append(stdout);
        ext.outputChannel.append(stderr);
        terminal.sendText(`docker pull ${registryName}/${imageName}`);
    }

    exec(`docker login ${registryName} -u ${username} -p ${password}`, cont);

}
