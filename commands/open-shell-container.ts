import * as vscode from 'vscode';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { DockerEngineType, docker } from './utils/docker-endpoint';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.open-shell';

const engineTypeShellCommands = {
    [DockerEngineType.Linux]: "/bin/sh",
    [DockerEngineType.Windows]: "powershell"
}

export function openShellContainer() {
    quickPickContainer().then((selectedItem: ContainerItem) => {
        if (selectedItem) {
            docker.getEngineType().then((engineType: DockerEngineType) => {
                const terminal = vscode.window.createTerminal(`Shell: ${selectedItem.label}`);
                terminal.sendText(`docker exec -it ${selectedItem.ids[0]} ${engineTypeShellCommands[engineType]}`);
                terminal.show();
                if (reporter) {
                    reporter.sendTelemetryEvent('command', {
                        command: teleCmdId,
                        dockerEngineType: engineTypeShellCommands[engineType]
                    });
                }
            });
        }
    });
}