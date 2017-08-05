import * as vscode from 'vscode';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { DockerEngineType, docker } from './utils/docker-endpoint';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.open-shell';

const engineTypeShellCommands = {
    [DockerEngineType.Linux]: "/bin/sh",
    [DockerEngineType.Windows]: "powershell"
}

export async function openShellContainer() {

    const selectedItem: ContainerItem = await quickPickContainer();
    
    if (selectedItem) {
        docker.getEngineType().then((engineType: DockerEngineType) => {
            const terminal = vscode.window.createTerminal(`Shell: ${selectedItem.containerDesc.Image}`);
            terminal.sendText(`docker exec -it ${selectedItem.containerDesc.Image} ${engineTypeShellCommands[engineType]}`);
            terminal.show();
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId,
                    dockerEngineType: engineTypeShellCommands[engineType]
                });
            }
        });
    }
}