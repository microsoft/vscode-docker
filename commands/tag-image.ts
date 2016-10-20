import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

export function tagImage() {

    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {

            var imageName: string;

            if (process.platform === 'win32') {
                imageName = vscode.workspace.rootPath.split('\\').pop().toLowerCase();
            } else {
                imageName = vscode.workspace.rootPath.split('/').pop().toLowerCase();
            }

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
                placeHolder: imageName,
                prompt: 'Tag image with...',
                value: imageName
            };

            vscode.window.showInputBox(opt).then((value: string) => {
                if (value) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
                    terminal.sendText(`docker tag ... ${value}`);
                    terminal.show();
                }

            });
        };
    });
}