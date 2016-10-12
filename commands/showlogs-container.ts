import vscode = require('vscode');
import {ContainerItem, quickPickContainer} from './utils/quick-pick-container';


export function showLogsContainer() {
    quickPickContainer().then(function (selectedItem: ContainerItem) {
        if (selectedItem) {
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker logs ${selectedItem.ids[0]}`);
            terminal.show();
        }
    });
}