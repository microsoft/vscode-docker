/* push-azure.ts
 *
 * Very basic integration for pushing to azure container registry instead of Docker hub
 * Author : Esteban Rey
 * Version 0.01
 * Updated 6/25/2018
 *
 * Known Issues:
 *
 * Does not currently identify if resource groups/container registry exist.
 * Is currently dependent on terminal installation of azure CLI
 * Review best practices for await
 * If user is not logged in no idea what to do
 * login rocketpenguininterns.azurecr.io
    Username: rocketPenguinInterns
    Password:
    Login Succeeded
 */

import vscode = require('vscode');
import { ExecuteCommandRequest } from 'vscode-languageclient/lib/main';
import { ImageNode } from '../../explorer/models/imageNode';
import { reporter } from '../../telemetry/telemetry';
import { ImageItem, quickPickImage } from '../utils/quick-pick-image';
//FOR TELEMETRY DATA
const teleCmdId: string = 'vscode-docker.image.pushToAzure';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';

const { exec } = require('child_process');

export async function pushAzure(context?: ImageNode): Promise<any> {
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

    if (context && context.imageDesc) {
        imageToPush = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        if (selectedItem) {
            imageToPush = selectedItem.imageDesc;
            imageName = selectedItem.label;
        }
    }

    if (imageToPush) {
        const terminal = vscode.window.createTerminal(imageName);

        //  1. Registry Name
        let options: vscode.InputBoxOptions = {
            prompt: "Azure Container Registry Name?"
        }

        let regName = await vscode.window.showInputBox(options);
        terminal.sendText(`az acr login --name ${regName}`);

        //  2. Resource Group Name
        options = {
            prompt: "Resource Group Name?"
        }
        let resGroup = await vscode.window.showInputBox(options);

        // 3. Check for the existance of the resource group, if doesnt exist, create -- maybe close enough feature?
        // 4. Acquire full acrLogin (Needs Testing)
        let cont = function (err, stdout, stderr) {
            console.log(stdout);
            let jsonStdout = JSON.parse(stdout);
            let soughtsrvr: string = "";
            for (let i = 0; i < jsonStdout.length; i++) {
                let srvrName: string = jsonStdout[i].acrLoginServer;
                let searchIndex: number = srvrName.search(`${regName}`);
                if (searchIndex === 0 && srvrName[regName.length] === '.') { // can names include . ?
                    soughtsrvr = srvrName;
                    break;
                }
            }

            if (soughtsrvr === '') {
                vscode.window.showErrorMessage(`${regName} could not be found in resource group: ${resGroup}`);
                return;
            }

            let tagPrompts = async function () {
                let repName = await vscode.window.showInputBox({ prompt: "Repository Name?" });
                let tag = await vscode.window.showInputBox({ prompt: "Tag?" });
                // 5. Tag image
                terminal.sendText(`docker tag  ${imageName} ${soughtsrvr}/${repName}:${tag}`);
                // 6. Push image
                terminal.sendText(`docker push ${soughtsrvr}/${repName}:${tag}`);
                terminal.show();
            }

            tagPrompts();

        }

        exec(`az acr list --resource-group ${resGroup} --query "[].{acrLoginServer:loginServer}" --output json`, cont);
    }
}

function streamToString(stream: any): Promise<string> {
    const chunks = []
    return new Promise<string>((resolve, reject) => {
        stream.on('data', chunks.push)
        stream.on('error', reject)
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    })
}
