import vscode = require('vscode');
import { ExecuteCommandRequest } from 'vscode-languageclient/lib/main';
import { ImageNode } from '../../explorer/models/imageNode';
import { reporter } from '../../telemetry/telemetry';
import { ImageItem, quickPickImage } from '../utils/quick-pick-image';
//FOR TELEMETRY DATA
const teleCmdId: string = 'vscode-docker.image.pullFromAzure';
//const { exec } = require('child_process');
import { activate } from '../../dockerExtension';
import { AzureImageNode } from '../../explorer/models/AzureRegistryNodes';
import { Registry } from '../../node_modules/azure-arm-containerregistry/lib/models';
import { Subscription } from '../../node_modules/azure-arm-resource/lib/subscription/models';
import * as acrTools from '../../utils/Azure/acrTools';
const teleAzureId: string = 'vscode-docker.pull.from.azure.azureContainerRegistry';

/* Pulls an image from Azure. The context would be the image node the user has right clicked on */
export async function pullFromAzure(context?: AzureImageNode): Promise<any> {
    console.log("in pull from Azure");

    // Step 1: Using loginCredentials() function to get the username and password. This takes care of users, even if they don't have the Azure CLI
    let credentials;
    try {
        credentials = await acrTools.loginCredentialsRefreshToken(context.subscription, context.registry, context);
    } catch (error) {
        console.log(error);
    }
    let username = credentials.username;
    let password = credentials.password;
    let registry = context.registry.loginServer;

    const terminal = vscode.window.createTerminal("Docker");
    terminal.show();

    // Step 2: docker login command
    terminal.sendText(`docker login ${registry} -u ${username} -p ${password}`);

    // Step 3: docker pull command
    console.log(context.repository);
    terminal.sendText(`docker pull ${registry}/${context.label}`);

    //Acquiring telemetry data here
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }

}
