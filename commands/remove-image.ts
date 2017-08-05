import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import vscode = require('vscode');
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.remove';

export async function removeImage() {

    const selectedItem: ImageItem = await quickPickImage(true);
    let imagesToRemove: Docker.ImageDesc[];

    if (selectedItem) {

        // if we're removing all images, remove duplicate IDs, a result of tagging
        if (selectedItem.label.toLowerCase().includes('all images')) {
            imagesToRemove = await docker.getImageDescriptors();
        } else {
            imagesToRemove = [selectedItem.imageDesc];
        }

        imagesToRemove.forEach((img) => {
            docker.getImage(img.Id).remove({force: true}, function(err, data: any) {
                if (err) { 
                    vscode.window.showErrorMessage(err.message);
                }
            });
        });
    
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}