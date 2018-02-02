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

async function compose(command: string, message: string, dockerComposeFileUri?: vscode.Uri) {
    let folder: vscode.WorkspaceFolder;

    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showErrorMessage('Docker compose can only run if VS Code is opened on a folder.');
        return;        
    }

    if (vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }
    
    if (!folder) {
        return;
    }
    
    let selectedItem: Item;
    if (dockerComposeFileUri) {
        selectedItem = createItem(folder, dockerComposeFileUri);
    } else {
        const uris: vscode.Uri[] = await getDockerComposeFileUris(folder);
        if (!uris || uris.length == 0) {
            vscode.window.showInformationMessage('Couldn\'t find any docker-compose files in your workspace.');
            return;
        }
        
        const items: vscode.QuickPickItem[] = computeItems(folder, uris);
        selectedItem = <Item>await vscode.window.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` });
    }

    if (selectedItem) {
        const terminal: vscode.Terminal = vscode.window.createTerminal('Docker Compose');
        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
        const build: string = configOptions.get('dockerComposeBuild', true) ? '--build': '';
        const detached: string = configOptions.get('dockerComposeDetached', true) ? '-d' : '';

        
        terminal.sendText(`cd "${folder.uri.fsPath}"`);
        terminal.sendText(command.toLowerCase() === 'up' ? `docker-compose -f ${selectedItem.file} ${command} ${detached} ${build}` : `docker-compose -f ${selectedItem.file} ${command}`);
        terminal.show();
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId + command
            });
        }

    }

}

export function composeUp(dockerComposeFileUri?: vscode.Uri) {
    compose('up', 'to bring up', dockerComposeFileUri);
}

export function composeDown(dockerComposeFileUri?: vscode.Uri) {
    compose('down', 'to take down', dockerComposeFileUri);
}