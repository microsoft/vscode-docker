import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { docker } from './utils/docker-endpoint';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.image.tag';

export async function tagImage() {

    const selectedItem: ImageItem = await quickPickImage(false);

    if (selectedItem) {

        let imageName: string = selectedItem.label;
        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');

        const defaultRegistryPath = configOptions.get('defaultRegistryPath', '');
        if (defaultRegistryPath.length > 0) {
            imageName = defaultRegistryPath + '/' + imageName;
        }

        const defaultRegistry = configOptions.get('defaultRegistry', '');
        if (defaultRegistry.length > 0) {
            imageName = defaultRegistry + '/' + imageName;
        }

        var opt: vscode.InputBoxOptions = {
            ignoreFocusOut: true,
            placeHolder: selectedItem.label,
            prompt: 'Tag image as...',
            value: imageName
        };

        const value: string = await vscode.window.showInputBox(opt);
        if (value) {
            let repo: string = value;
            let tag: string = 'latest';

            if (value.lastIndexOf(':') > 0) {
                repo = value.slice(0, value.lastIndexOf(':'));
                tag = value.slice(value.lastIndexOf(':') + 1);
            }

            const image = docker.getImage(selectedItem.imageDesc.Id);

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
    };
}