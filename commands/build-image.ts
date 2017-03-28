import * as path from "path";
import * as vscode from "vscode";
import { reporter } from '../telemetry/telemetry';
import { DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';

const teleCmdId: string = 'vscode-docker.image.build';

function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getDockerFileUris(): Thenable<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }
    return Promise.resolve(vscode.workspace.findFiles(DOCKERFILE_GLOB_PATTERN, null, 1000, null));
}

interface Item extends vscode.QuickPickItem {
    file: string,
    path: string
}

function createItem(uri: vscode.Uri): Item {
    let filePath = hasWorkspaceFolder() ? path.join(".", uri.fsPath.substr(vscode.workspace.rootPath.length)) : uri.fsPath;

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(uris: vscode.Uri[]): vscode.QuickPickItem[] {
    let items: vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i]));
    }
    return items;
}

function resolveImageItem(dockerFileUri?: vscode.Uri): Promise<Item> {
    return new Promise((resolve) => {
        if (dockerFileUri) {
            return resolve(createItem(dockerFileUri));
        };

        getDockerFileUris().then((uris: vscode.Uri[]) => {
            if (!uris || uris.length == 0) {
                vscode.window.showInformationMessage('Couldn\'t find a Dockerfile in your workspace.');
                resolve();
            } else {
                let items: vscode.QuickPickItem[] = computeItems(uris);
                vscode.window.showQuickPick(items, { placeHolder: 'Choose Dockerfile to build' }).then(resolve);
            }
        });
    });
}

export function buildImage(dockerFileUri?: vscode.Uri) {
    resolveImageItem(dockerFileUri).then((uri: Item) => {
        if (!uri) return;

        let imageName: string;
        if (process.platform === 'win32') {
            imageName = uri.path.split('\\').pop().toLowerCase();
        } else {
            imageName = uri.path.split('/').pop().toLowerCase();
        }

        if (imageName === '.') {
            if (process.platform === 'win32') {
                imageName = vscode.workspace.rootPath.split('\\').pop().toLowerCase();
            } else {
                imageName = vscode.workspace.rootPath.split('/').pop().toLowerCase();
            }
        }

        const opt: vscode.InputBoxOptions = {
            placeHolder: imageName + ':latest',
            prompt: 'Tag image as...',
            value: imageName + ':latest'
        };

        vscode.window.showInputBox(opt).then((value: string) => {
            if (!value) return;

            let terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
            terminal.sendText(`docker build -f ${uri.file} -t ${value} ${uri.path}`);
            terminal.show();
            
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId
                });
            }
        });
    });
}