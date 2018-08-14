import * as cp from 'child_process';
import * as fs from 'fs';
import os = require('os');
import vscode = require('vscode');
import { ImageNode } from '../explorer/models/imageNode';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { docker, DockerEngineType } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.container.start';

export async function startContainer(context?: ImageNode, interactive?: boolean): Promise<void> {
    let imageName: string;
    let imageToStart: Docker.ImageDesc;

    if (context && context.imageDesc) {
        imageToStart = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage(false)
        if (selectedItem) {
            imageToStart = selectedItem.imageDesc;
            imageName = selectedItem.label;
        }
    }

    if (imageToStart) {
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

            if (reporter) {
                /* __GDPR__
                   "command" : {
                      "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                   }
                 */
                reporter.sendTelemetryEvent('command', {
                    command: interactive ? teleCmdId + '.interactive' : teleCmdId
                });
            }
        });
    }
}

export async function startContainerInteractive(context: ImageNode): Promise<void> {
    await startContainer(context, true);
}

export async function startAzureCLI(): Promise<cp.ChildProcess> {

    // block of we are running windows containers...
    const engineType: DockerEngineType = await docker.getEngineType();

    if (engineType === DockerEngineType.Windows) {
        const selected = await vscode.window.showErrorMessage<vscode.MessageItem>('Currently, you can only run the Azure CLI when running Linux based containers.',
            {
                title: 'More Information',
            },
            {
                title: 'Close',
                isCloseAffordance: true
            }
        );
        if (!selected || selected.isCloseAffordance) {
            return;
        }
        return cp.exec('start https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers');
    } else {
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
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId + '.azurecli'
            });
        }
    }
}
