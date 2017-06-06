import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.push';

export async function pushImage() {

    const selectedItem: ImageItem = await quickPickImage();
    if (selectedItem) {
        const terminal = vscode.window.createTerminal(selectedItem.label);
        terminal.sendText(`docker push ${selectedItem.label}`);
        terminal.show();
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    };
}