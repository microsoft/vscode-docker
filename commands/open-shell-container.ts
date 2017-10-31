import * as vscode from 'vscode';
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { DockerEngineType, docker } from './utils/docker-endpoint';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.open-shell';

const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
const engineTypeShellCommands = {
    [DockerEngineType.Linux]: configOptions.get('attachShellCommand.linuxContainer', '/bin/sh'),
    [DockerEngineType.Windows]: configOptions.get('attachShellCommand.windowsContainer', 'powershell')
}

export async function openShellContainer(context?: ContainerNode) {
    let containerToAttach: Docker.ContainerDesc;

    if (context && context.containerDesc) {
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