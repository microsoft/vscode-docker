import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.push';

export function pushImage() {
    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker push ${selectedItem.label}`);
            terminal.show();
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId
                });
            }
        };
    });
}