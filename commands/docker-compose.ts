import * as path from 'path';
import * as vscode from 'vscode';
import { COMPOSE_FILE_GLOB_PATTERN, dockerExplorerProvider } from '../dockerExtension';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.compose.'; // we append up or down when reporting telemetry

async function getDockerComposeFileUris(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    // TODO@Ben use relative pattern support
    return await vscode.workspace.findFiles(COMPOSE_FILE_GLOB_PATTERN, null, 9999, null);
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(uri: vscode.Uri, folder?: vscode.WorkspaceFolder): Item {
    const filePath = folder ? path.join('.', uri.fsPath.substr(folder.uri.fsPath.length)) : uri.fsPath;

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(uris: vscode.Uri[], folder?: vscode.WorkspaceFolder): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i], folder));
    }
    return items;
}

export async function compose(command: string, message: string) {
    // TODO@Ben need the workspace folder picker here
    let folder: vscode.WorkspaceFolder = void 0;
    if (!folder) {
        vscode.window.showErrorMessage('Docker files can only be generated if VS Code is opened on a folder.');
        return;
    }

    const uris: vscode.Uri[] = await getDockerComposeFileUris(folder);
    if (!uris || uris.length == 0) {
        vscode.window.showInformationMessage('Couldn\'t find any docker-compose file in your workspace.');
    } else {
        const items: vscode.QuickPickItem[] = computeItems(uris, folder);
        const selectedItem: Item = <Item>await vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` });
        if (selectedItem) {
            const terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
            terminal.sendText(`docker-compose -f ${selectedItem.file} ${command}`);
            terminal.show();
            dockerExplorerProvider.refreshContainers(true);
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId + command
                });
            }

        }
    }
}

export function composeUp() {
    compose('up', 'to bring up');
}

export function composeDown() {
    compose('down', 'to take down');
}