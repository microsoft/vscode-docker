import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
import { ImageNode } from '../explorer/models/imageNode';
const teleCmdId: string = 'vscode-docker.image.push';
const teleAzureId: string = 'vscode-docker.image.push.azureContainerRegistry';

export async function pushImage(context?: ImageNode) {
    let imageToPush: Docker.ImageDesc;
    let imageName: string = "";

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
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });

            if (imageName.toLowerCase().indexOf('azurecr.io')) {
                /* __GDPR__
                   "command" : {
                      "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                   }
                 */
                reporter.sendTelemetryEvent('command', {
                    command: teleAzureId
                });

            }
        }
    };
}
