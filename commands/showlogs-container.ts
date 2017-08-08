import vscode = require('vscode');
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { DockerNode } from '../explorer/dockerExplorer';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.show-logs';

export async function showLogsContainer(context?: DockerNode) {

    let containerToLog: Docker.ContainerDesc;

    if (context) {
        containerToLog = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(false, opts);
        if (selectedItem) {
            containerToLog = selectedItem.containerDesc;
        }
    }

    if (containerToLog) {
        const terminal = vscode.window.createTerminal(containerToLog.Image);
        terminal.sendText(`docker logs -f ${containerToLog.Image}`);
        terminal.show();
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}