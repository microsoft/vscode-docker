import * as path from 'path';
import * as vscode from 'vscode';
import { COMPOSE_FILE_GLOB_PATTERN } from '../dockerExtension';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.compose.'; // we append up or down when reporting telemetry

function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getDockerComposeFileUris(): Thenable<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }
    return Promise.resolve(vscode.workspace.findFiles(COMPOSE_FILE_GLOB_PATTERN, null, 9999, null));
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri): Item {
    let filePath = hasWorkspaceFolder() ? path.join('.', uri.fsPath.substr(vscode.workspace.rootPath.length)) : uri.fsPath;

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

export function compose(command: string, message: string) {
    getDockerComposeFileUris().then(function (uris: vscode.Uri[]) {
        if (!uris || uris.length == 0) {
            vscode.window.showInformationMessage('Couldn\'t find any docker-compose file in your workspace.');
        } else {
            let items: vscode.QuickPickItem[] = computeItems(uris);
            vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` }).then(function (selectedItem: Item) {
                if (selectedItem) {
                    let terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
                    terminal.sendText(`docker-compose -f ${selectedItem.file} ${command}`);
                    terminal.show();
                    if (reporter) {
                        reporter.sendTelemetryEvent('command', {
                            command: teleCmdId + command
                        });
                    }

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