import * as path from 'path';
import * as vscode from 'vscode';
import { dockerExplorerProvider, COMPOSE_FILE_GLOB_PATTERN } from '../dockerExtension';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.compose.'; // we append up or down when reporting telemetry

function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

async function getDockerComposeFileUris(): Promise<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return;
    }
    return await vscode.workspace.findFiles(COMPOSE_FILE_GLOB_PATTERN, null, 9999, null);
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri): Item {
    const filePath = hasWorkspaceFolder() ? path.join('.', uri.fsPath.substr(vscode.workspace.rootPath.length)) : uri.fsPath;

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(uris: vscode.Uri[]): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i]));
    }
    return items;
}

export async function compose(command: string, message: string) {

    const uris: vscode.Uri[] = await getDockerComposeFileUris();
    if (!uris || uris.length == 0) {
        vscode.window.showInformationMessage('Couldn\'t find any docker-compose file in your workspace.');
    } else {
        const items: vscode.QuickPickItem[] = computeItems(uris);
        const selectedItem: Item = <Item>await vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` });
        if (selectedItem) {
            const terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
            terminal.sendText(`docker-compose -f ${selectedItem.file} ${command}`);
            terminal.show();
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId + command
                });
            }
            dockerExplorerProvider.refreshContainers();
        }
    }
}

export function composeUp() {
    compose('up', 'to bring up');
}

export function composeDown() {
    compose('down', 'to take down');
}