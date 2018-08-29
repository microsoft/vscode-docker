/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as fs from 'fs';
import os = require('os');
import vscode = require('vscode');
import { IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { docker, DockerEngineType } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

export async function startContainer(context?: ImageNode, interactive?: boolean): Promise<void> {
    let imageName: string; //asdf
    let imageToStart: Docker.ImageDesc;

    if (context && context.imageDesc) {
        imageToStart = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage(false)
        imageToStart = selectedItem.imageDesc;
        imageName = selectedItem.label;
    }

    docker.getExposedPorts(imageToStart.Id).then((ports: string[]) => {
        let options = `--rm ${interactive ? '-it' : '-d'}`;
        if (ports.length) {
            const portMappings = ports.map((port) => `-p ${port.split("/")[0]}:${port}`); //'port' is of the form number/protocol, eg. 8080/udp.
            // In the command, the host port has just the number (mentioned in the EXPOSE step), while the destination port can specify the protocol too
            options += ` ${portMappings.join(' ')}`;
        }

        const terminal = ext.terminalProvider.createTerminal(imageName);
        terminal.sendText(`docker run ${options} ${imageName}`);
        terminal.show();
    });
}

export async function startContainerInteractive(context: ImageNode): Promise<void> {
    await startContainer(context, true);
}

export async function startAzureCLI(actionContext: IActionContext): Promise<void> {
    // block of we are running windows containers...
    const engineType: DockerEngineType = await docker.getEngineType(); //asdf

    if (engineType === DockerEngineType.Windows) {
        const message = 'Currently, you can only run the Azure CLI when running Linux based containers.'; //asdf
        actionContext.properties.cancelStep = 'CanOnlyRunCLIOnWindowsWithLinuxContainers';
        const selected = await vscode.window.showErrorMessage<vscode.MessageItem>(message,
            {
                title: 'More Information',
            },
            {
                title: 'Close',
                isCloseAffordance: true
            }
        );
        if (selected && !selected.isCloseAffordance) {
            await cp.exec('start https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers');
        }
        throw new UserCancelledError(); //asdf
    }

    const option: string = process.platform === 'linux' ? '--net=host' : '';

    // volume map .azure folder so don't have to log in every time
    const homeDir: string = process.platform === 'win32' ? os.homedir().replace(/\\/g, '/') : os.homedir();
    let vol: string = '';

    if (fs.existsSync(`${homeDir}/.azure`)) {
        vol += ` -v ${homeDir}/.azure:/root/.azure`;
    }
    if (fs.existsSync(`${homeDir}/.ssh`)) {
        vol += ` -v ${homeDir}/.ssh:/root/.ssh`;
    }
    if (fs.existsSync(`${homeDir}/.kube`)) {
        vol += ` -v ${homeDir}/.kube:/root/.kube`;
    }

    const cmd: string = `docker run ${option} ${vol.trim()} -it --rm azuresdk/azure-cli-python:latest`;
    const terminal: vscode.Terminal = vscode.window.createTerminal('Azure CLI');
    terminal.sendText(cmd);
    terminal.show();
}
