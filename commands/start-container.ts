import vscode = require('vscode');
import {ImageItem, quickPickImage} from './utils/quick-pick-image';


function doStartContainer(interactive: boolean) {
    quickPickImage().then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            let option = interactive ? '-it' : '';
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker run ${option} --rm ${selectedItem.label}`);
            terminal.show();
        }
    });
}

export function startContainer() {
    doStartContainer(false);
}

export function startContainerInteractive() {
    doStartContainer(true);
}