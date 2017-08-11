import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
import { DockerNode } from '../explorer/dockerExplorer';
const teleCmdId: string = 'vscode-docker.image.push';

export async function pushImage(context?: DockerNode) {
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

    // if invokde from the explorer we have the name of the image
    // otherwise open a quick pick list
    if (context && context.imageDesc) {
        imageToPush = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage();
        if (selectedItem) {
            imageToPush = selectedItem.imageDesc;
            imageName = selectedItem.label;
        }
    }

    if (imageToPush) {
        const terminal = vscode.window.createTerminal(imageName);
        terminal.sendText(`docker push ${imageName}`);
        terminal.show();
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    };
}