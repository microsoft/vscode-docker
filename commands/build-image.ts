import vscode = require('vscode');


function hasWorkspaceFolder() : boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getDockerFileUris(): Thenable<vscode.Uri[]>{
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }
    return Promise.resolve(vscode.workspace.findFiles('**/[dD]ocker[fF]ile', null, 9999, null));
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri) : Item {
    let length = vscode.workspace.rootPath.length;
    let label = uri.path.substr(length);
    return <Item> {
        label: label,
        description: null,
        path: '.' + label.substr(0, label.length - '/dockerfile'.length),
        file: '.' + label
    };
}

function computeItems(uris: vscode.Uri[]) : vscode.QuickPickItem[] {
    let items : vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i]));
    }
    return items;
}

export function buildImage() {
    getDockerFileUris().then(function (uris: vscode.Uri[]) {
        if (!uris || uris.length == 0) {
            vscode.window.showInformationMessage('Couldn\'t find any dockerfile in your workspace.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(uris);
            vscode.window.showQuickPick(items, { placeHolder: 'Choose Dockerfile to build' }).then(function(selectedItem : Item) {
                if (selectedItem) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
                    let imageName: string = selectedItem.path.split('/').pop().toLowerCase();
                    let configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
                    let defaultRegistry: string = configOptions.get('defaultRegistry', '');
                    let defaultRegistryPath: string = configOptions.get('defaultRegistryPath', '');
                    if (defaultRegistryPath.length > 0) {
                        imageName = defaultRegistryPath + '/' + imageName;
                    }
                    if (defaultRegistry.length > 0) {
                        imageName = defaultRegistry + '/' + imageName;
                    }
                    terminal.sendText(`docker build  -f ${selectedItem.file} -t ${imageName} ${selectedItem.path}`);
                    terminal.show();
                }
            });
        }
    });
}