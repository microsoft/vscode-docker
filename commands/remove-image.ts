import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import vscode = require('vscode');
import { reporter } from '../telemetry/telemetry';
import { ImageNode } from "../explorer/models/imageNode";
import { dockerExplorerProvider } from '../dockerExtension';

const teleCmdId: string = 'vscode-docker.image.remove';

export async function removeImage(context?: ImageNode) {

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
                docker.getImage(img.Id).remove({ force: true }, function (err, data: any) {
                    imageCounter++;
                    if (err) {
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
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}