import vscode = require('vscode');
import {ContainerItem, quickPickContainer} from './utils/quick-pick-container';

export function openShellContainer() {
    quickPickContainer().then(function (selectedItem: ContainerItem) {
        if (selectedItem) {
            let terminal = vscode.window.createTerminal(`sh ${selectedItem.label}`);
            terminal.sendText(`docker exec -it ${selectedItem.ids[0]} /bin/sh`);
            terminal.show();
        }
    });
}