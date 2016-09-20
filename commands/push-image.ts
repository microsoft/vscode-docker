import vscode = require('vscode');
import {ImageItem, quickPickImage} from './utils/quick-pick-image';

export function pushImage() {
    quickPickImage().then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker push ${selectedItem.label}`);
            terminal.show();
        };
    });
}