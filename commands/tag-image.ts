import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { docker } from './utils/docker-endpoint';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.tag';

export function tagImage() {

    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {

            var imageName: string = selectedItem.label;

            let configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');

            let defaultRegistryPath = configOptions.get('defaultRegistryPath', '');
            if (defaultRegistryPath.length > 0) {
                imageName = defaultRegistryPath + '/' + imageName;
            }

            let defaultRegistry = configOptions.get('defaultRegistry', '');
            if (defaultRegistry.length > 0) {
                imageName = defaultRegistry + '/' + imageName;
            }

            var opt: vscode.InputBoxOptions = {
                ignoreFocusOut: true,
                placeHolder: selectedItem.label,
                prompt: 'Tag image as...',
                value: imageName
            };

            vscode.window.showInputBox(opt).then((value: string) => {
                if (value) {
                    var repo: string = value;
                    var tag: string = 'latest';
                    if (value.lastIndexOf(':') > 0) {
                        repo = value.slice(0, value.lastIndexOf(':'));
                        tag = value.slice(value.lastIndexOf(':') + 1);
                    }
                    let image = docker.getImage(selectedItem.ids[0]);
                    image.tag({ repo: repo, tag: tag }, function (err, data) {
                        if (err) {
                            console.log('Docker Tag error: ' + err);
                        }
                    });
                    if (reporter) {
                        reporter.sendTelemetryEvent('command', {
                            command: teleCmdId
                        });
                    }
                }
            });
        };
    });
}