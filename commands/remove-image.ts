import vscode = require('vscode');
import { dockerExplorerProvider } from '../dockerExtension';
import { ImageNode } from "../explorer/models/imageNode";
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.image.remove';

export async function removeImage(context?: ImageNode): Promise<void> {

    let imagesToRemove: Docker.ImageDesc[];

    if (context && context.imageDesc) {
        imagesToRemove = [context.imageDesc];
    } else {
        const selectedItem: ImageItem = await quickPickImage(true);
        if (selectedItem) {
            if (selectedItem.label.toLowerCase().includes('all containers')) {
                imagesToRemove = await docker.getImageDescriptors();
            } else {
                imagesToRemove = [selectedItem.imageDesc];
            }
        }
    }

    if (imagesToRemove) {
        const numImages: number = imagesToRemove.length;
        let imageCounter: number = 0;

        vscode.window.setStatusBarMessage("Docker: Removing Image(s)...", new Promise((resolve, reject) => {
            imagesToRemove.forEach((img) => {
                // tslint:disable-next-line:no-function-expression // Grandfathered in
                docker.getImage(img.Id).remove({ force: true }, function (err: { message?: string }, data: any): void {
                    imageCounter++;
                    if (err) {
                        // TODO: use parseError, proper error handling
                        vscode.window.showErrorMessage(err.message);
                        reject();
                    }
                    if (imageCounter === numImages) {
                        resolve();
                    }
                });
            });
        }));
    }

    if (reporter) {
        /* __GDPR__
           "command" : {
              "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
           }
         */
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
