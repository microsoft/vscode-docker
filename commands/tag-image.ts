import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { docker } from './utils/docker-endpoint';
import { reporter } from '../telemetry/telemetry';
import { ImageNode } from "../explorer/models/imageNode";

const teleCmdId: string = 'vscode-docker.image.tag';

export async function tagImage(context?: ImageNode) {

    let imageName: string;
    let imageToTag: Docker.ImageDesc;

    if (context && context.imageDesc) {
        imageToTag = context.imageDesc;
        imageName = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage(false);
        if (selectedItem) {
            imageToTag = selectedItem.imageDesc
            imageName = selectedItem.label;
        }

    }

    if (imageToTag) {

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
            placeHolder: imageName,
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

            const image = docker.getImage(imageToTag.Id);

            image.tag({ repo: repo, tag: tag }, function (err: Error, data: any) {
                if (err) {
                    vscode.window.showErrorMessage('Docker Tag error: ' + err.message);
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