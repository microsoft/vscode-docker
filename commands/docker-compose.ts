import vscode = require('vscode');


function hasWorkspaceFolder() : boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getDockerComposeFileUris(): Thenable<vscode.Uri[]>{
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }
    return Promise.resolve(vscode.workspace.findFiles('{**/[dD]ocker-[cC]ompose.*.yml,**/[dD]ocker-[cC]ompose.yml}', null, 9999, null));
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri) : Item {
    let length = vscode.workspace.rootPath.length;
    let label = uri.fsPath.substr(length);
    let slashIndex = label.lastIndexOf('/');
    return <Item> {
        label: label,
        description: null,
        path: '.' + label.substr(0, slashIndex),
        file: label.substr(slashIndex + 1)
    };
}

function computeItems(uris: vscode.Uri[]) : vscode.QuickPickItem[] {
    let items : vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i]));
    }
    return items;
}

export function compose(command: string, message: string) {
    getDockerComposeFileUris().then(function (uris: vscode.Uri[]) {
        if (!uris || uris.length == 0) {
            vscode.window.showInformationMessage('Couldn\'t find any docker-compose file in your workspace.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(uris);
            vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` }).then(function(selectedItem : Item) {
                if (selectedItem) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
                    terminal.sendText(`cd ${selectedItem.path}; docker-compose -f ${selectedItem.file} ${command}`);
                    terminal.show();
                }
            });
        }
    });
}

export function composeUp() {
    compose('up', 'to bring up');
}

export function composeDown() {
    compose('down', 'to take down');
}