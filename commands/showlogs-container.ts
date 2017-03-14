import vscode = require('vscode');
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.container.show-logs';

export function showLogsContainer() {
    quickPickContainer().then(function (selectedItem: ContainerItem) {
        if (selectedItem) {
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker logs -f ${selectedItem.ids[0]}`);
            terminal.show();
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId
                });
            }
        }
    });
}