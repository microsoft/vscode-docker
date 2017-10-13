import * as path from 'path';
import * as vscode from 'vscode';
import { COMPOSE_FILE_GLOB_PATTERN } from '../dockerExtension';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.compose.'; // we append up or down when reporting telemetry

async function getDockerComposeFileUris(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, COMPOSE_FILE_GLOB_PATTERN), null, 9999, null);
}

interface Item extends vscode.QuickPickItem {
    path: string,
    file: string
}

function createItem(folder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    const filePath = folder ? path.join('.', uri.fsPath.substr(folder.uri.fsPath.length)) : uri.fsPath;

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(folder: vscode.WorkspaceFolder, uris: vscode.Uri[]): vscode.QuickPickItem[] {
    const items: vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(folder, uris[i]));
    }
    return items;
}

export async function compose(command: string, message: string) {
    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }

    if (!folder) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Docker compose can only run if VS Code is opened on a folder.');
        } else {
            vscode.window.showErrorMessage('Docker compose can only run if a workspace folder is picked in VS Code.');
        }
        return;
    }

    const uris: vscode.Uri[] = await getDockerComposeFileUris(folder);
    if (!uris || uris.length == 0) {
        vscode.window.showInformationMessage('Couldn\'t find any docker-compose file in your workspace.');
    } else {
        const items: vscode.QuickPickItem[] = computeItems(folder, uris);
        const selectedItem: Item = <Item>await vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` });
        if (selectedItem) {
            const terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
            terminal.sendText(command.toLowerCase() === 'up' ? `docker-compose -f ${selectedItem.file} ${command} -d --build` : `docker-compose -f ${selectedItem.file} ${command}`);
            terminal.show();
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