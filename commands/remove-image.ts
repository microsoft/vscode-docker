import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import vscode = require('vscode');
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.remove';

export function removeImage() {
    quickPickImage(true).then(function (selectedItem: ImageItem) {
        if (selectedItem) {

            // if we're removing all images, remove duplicate IDs, a result of tagging
            if (selectedItem.label.toLowerCase().includes('all images')) {
                selectedItem.ids = Array.from(new Set(selectedItem.ids));
            }

            for (let i = 0; i < selectedItem.ids.length; i++) {
                let image = docker.getImage(selectedItem.ids[i]);

                // image.remove removes by ID, so to remove a single *tagged* image we
                // just overwrite the name. this is a hack around the dockerode api
                if (selectedItem.ids.length === 1) {
                    if (!selectedItem.label.toLowerCase().includes('<none>')) {
                        image.name = selectedItem.label;
                    }
                }

                image.remove({ force: true }, function (err, data: any) {

                    if (data) {
                        for (i = 0; i < data.length; i++) {
                            if (data[i].Untagged) {
                                console.log(data[i].Untagged);
                            } else if (data[i].Deleted) {
                                console.log(data[i].Deleted);
                            }
                        }

                        vscode.window.showInformationMessage(selectedItem.label + ' successfully removed');

                        if (reporter) {
                            reporter.sendTelemetryEvent('command', {
                                command: teleCmdId
                            });
                        }
                    }
                });
            }

            // show the list again unless the user just did a 'remove all images'
            // if (!selectedItem.label.toLowerCase().includes('all images')) {
            //     setInterval(removeImage, 1000);
            // }

        }
    });
}