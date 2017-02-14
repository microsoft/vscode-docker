import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { DockerEngineType, docker } from './utils/docker-endpoint';
import * as cp from 'child_process';
import os = require('os');


function doStartContainer(interactive: boolean) {
    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            let option = interactive ? '-it' : '';
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker run ${option} --rm ${selectedItem.label}`);
            terminal.show();
        }
    });
}

export function startContainer() {
    doStartContainer(false);
}

export function startContainerInteractive() {
    doStartContainer(true);
}

export function startAzureCLI() {

    // block of we are running windows containers... 
    docker.getEngineType().then((engineType: DockerEngineType) => {

        if (engineType === DockerEngineType.Windows) {
            vscode.window.showErrorMessage<vscode.MessageItem>('Currently, you can only run the Azure CLI when running Linux based containers.',
                {
                    title: 'More Information',
                },
                {
                    title: 'Close',
                    isCloseAffordance: true
                }
            ).then((selected) => {
                if (!selected || selected.isCloseAffordance) {
                    return;
                }
                return cp.exec('start https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers');
            });
        } else {
            let option: string = process.platform === 'linux' ? '--net=host' : '';
            
            // volume map .azure folder so don't have to log in every time
            let homeDir: string = process.platform === 'win32' ? os.homedir().replace(/\\/g, '/') : os.homedir();
            let vol: string = '-v ' + homeDir + '/.azure:/root/.azure';
            let cmd: string = `docker run ${option} ${vol} -it --rm azuresdk/azure-cli-python:latest`;

            //docker run  -v c:/Users/cdias/.azure:/root/.azure -it --rm azuresdk/azure-cli-python:latest
            let terminal: vscode.Terminal = vscode.window.createTerminal('Azure CLI');
            terminal.sendText(cmd);
            terminal.show();

        }
    });
}