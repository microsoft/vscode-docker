import * as vscode from 'vscode';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { DockerEngineType, docker } from './utils/docker-endpoint';
import { DockerNode } from '../explorer/dockerExplorer';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.open-shell';

const engineTypeShellCommands = {
    [DockerEngineType.Linux]: "/bin/sh",
    [DockerEngineType.Windows]: "powershell"
}

export async function openShellContainer(context?: DockerNode) {
    let containerToAttach: Docker.ContainerDesc;

    if (context) {
        containerToAttach = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(false, opts);
        if (selectedItem) {
            containerToAttach = selectedItem.containerDesc;
        }
    }

    if (containerToAttach) {
        docker.getEngineType().then((engineType: DockerEngineType) => {
            const terminal = vscode.window.createTerminal(`Shell: ${containerToAttach.Image}`);
            terminal.sendText(`docker exec -it ${containerToAttach.Id} ${engineTypeShellCommands[engineType]}`);
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