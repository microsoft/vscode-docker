import vscode = require('vscode');
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.show-logs';

export async function showLogsContainer() {

    const selectedItem: ContainerItem = await quickPickContainer();
    if (selectedItem) {
        const terminal = vscode.window.createTerminal(selectedItem.containerDesc.Image);
        terminal.sendText(`docker logs -f ${selectedItem.containerDesc.Image}`);
        terminal.show();
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}