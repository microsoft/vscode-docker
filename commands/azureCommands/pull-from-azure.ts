/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { exec } from 'child_process';
import vscode = require('vscode');
import { AzureImageTagNode, AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import { formatTag, getCatalog, getTags } from '../../explorer/models/commonRegistryUtils';
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';

/* Pulls an image from Azure. The context is the image node the user has right clicked on */
export async function pullFromAzure(context?: AzureImageTagNode | AzureRepositoryNode): Promise<any> {

    if (context) {
        // Using loginCredentials function to get the username and password. This takes care of all users, even if they don't have the Azure CLI
        const credentials = await acrTools.loginCredentials(context.registry);
        const username = credentials.username;
        const password = credentials.password;
        const registry = context.registry.loginServer;

        const terminal = ext.terminalProvider.createTerminal("Docker");
        terminal.show();

        let cont = (err, stdout, stderr) => {
            ext.outputChannel.append(stdout);
            ext.outputChannel.append(stderr);
            terminal.sendText(`docker pull ${registry}/${context.label}`);
        }

        exec(`docker login ${registry} -u ${username} -p ${password}`, cont);
    } else {

    }

}
