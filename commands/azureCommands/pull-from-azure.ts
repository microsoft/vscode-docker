import vscode = require('vscode');
import { AzureImageTagNode } from '../../explorer/models/azureRegistryNodes';
import * as acrTools from '../../utils/Azure/acrTools';

/* Pulls an image from Azure. The context is the image node the user has right clicked on */
export async function pullFromAzure(context?: AzureImageTagNode): Promise<any> {

    // Step 1: Using getLoginCredentials function to get the username and password. This takes care of all users, even if they don't have the Azure CLI
    const credentials = await acrTools.getLoginCredentials(context.registry);
    const username = credentials.username;
    const password = credentials.password;
    const registry = context.registry.loginServer;

    const terminal = vscode.window.createTerminal("Docker");
    terminal.show();

    // Step 2: docker login command
    await terminal.sendText(`docker login ${registry} -u ${username} -p ${password}`);

    // Step 3: docker pull command
    await terminal.sendText(`docker pull ${registry}/${context.label}`);
}
