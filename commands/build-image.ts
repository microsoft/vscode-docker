import vscode = require('vscode');


function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getDockerFileUris(): Thenable<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }
    return Promise.resolve(vscode.workspace.findFiles('**/[dD]ocker[fF]ile', null, 9999, null));
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri): Item {
    let length = vscode.workspace.rootPath.length;
    let label = uri.fsPath.substr(length);
    return <Item>{
        label: label,
        description: null,
        path: '.' + label.substr(0, label.length - '/dockerfile'.length),
        file: '.' + label
    };
}

function computeItems(uris: vscode.Uri[]): vscode.QuickPickItem[] {
    let items: vscode.QuickPickItem[] = [];
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
            vscode.window.showQuickPick(items, { placeHolder: 'Choose Dockerfile to build' }).then(function (selectedItem: Item) {
                if (selectedItem) {

                    // TODO: Prompt for name, prefill with generated name below...

                    var imageName: string;

                    if (process.platform === 'win32') {
                        imageName = selectedItem.path.split('\\').pop().toLowerCase();
                    } else {
                        imageName = selectedItem.path.split('/').pop().toLowerCase();
                    }

                    if (imageName === '.') {
                        if (process.platform === 'win32') {
                            imageName = vscode.workspace.rootPath.split('\\').pop().toLowerCase();
                        } else {
                            imageName = vscode.workspace.rootPath.split('/').pop().toLowerCase();
                        }
                    }

                    var opt: vscode.InputBoxOptions = {
                        prompt: 'Tag image as...',
                        value: imageName + ':latest',
                        placeHolder: imageName + ':latest'
                    }

                    vscode.window.showInputBox(opt).then((value: string) => {

                        if (!value) {
                            return;
                        }

                        let terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
                        terminal.sendText(`docker build  -f ${selectedItem.file} -t ${value} ${selectedItem.path}`);
                        terminal.show();

                    });

                }
            });
        }
    });
}