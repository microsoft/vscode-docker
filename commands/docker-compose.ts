import * as path from 'path';
import * as vscode from 'vscode';
import { COMPOSE_FILE_GLOB_PATTERN } from '../dockerExtension';
import { ext } from '../extensionVariables';
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
    // tslint:disable-next-line:prefer-for-of // Grandfathered in
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(folder, uris[i]));
    }
    return items;
}

async function compose(commands: ('up' | 'down')[], message: string, dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
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

    let commandParameterFileUris: vscode.Uri[];
    if (selectedComposeFileUris && selectedComposeFileUris.length) {
        commandParameterFileUris = selectedComposeFileUris;
    } else if (dockerComposeFileUri) {
        commandParameterFileUris = [dockerComposeFileUri];
    } else {
        commandParameterFileUris = [];
    }
    let selectedItems: Item[] = commandParameterFileUris.map(uri => createItem(folder, uri));
    if (!selectedItems.length) {
        // prompt for compose file
        const uris: vscode.Uri[] = await getDockerComposeFileUris(folder);
        if (!uris || uris.length === 0) {
            vscode.window.showInformationMessage('Couldn\'t find any docker-compose files in your workspace.');
            return;
        }

        const items: vscode.QuickPickItem[] = computeItems(folder, uris);
        selectedItems = [<Item>await ext.ui.showQuickPick(items, { placeHolder: `Choose Docker Compose file ${message}` })];
    }

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Docker Compose');
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const build: string = configOptions.get('dockerComposeBuild', true) ? '--build' : '';
    const detached: string = configOptions.get('dockerComposeDetached', true) ? '-d' : '';

    terminal.sendText(`cd "${folder.uri.fsPath}"`);
    for (let command of commands) {
        selectedItems.forEach((item: Item) => {
            terminal.sendText(command.toLowerCase() === 'up' ? `docker-compose -f "${item.file}" ${command} ${detached} ${build}` : `docker-compose -f "${item.file}" ${command}`);
        });
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

export async function composeUp(dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(['up'], 'to bring up', dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeDown(dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(['down'], 'to take down', dockerComposeFileUri, selectedComposeFileUris);
}

export async function composeRestart(dockerComposeFileUri?: vscode.Uri, selectedComposeFileUris?: vscode.Uri[]): Promise<void> {
    return await compose(['down', 'up'], 'to restart', dockerComposeFileUri, selectedComposeFileUris);
}
