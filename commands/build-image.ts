import * as path from "path";
import * as vscode from "vscode";
import { DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';
import { ext } from "../extensionVariables";
import { reporter } from '../telemetry/telemetry';

const teleCmdId: string = 'vscode-docker.image.build';

async function getDockerFileUris(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, DOCKERFILE_GLOB_PATTERN), null, 1000, null);
}

interface Item extends vscode.QuickPickItem {
    file: string,
    path: string
}

function createItem(folder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    let filePath = path.join(".", uri.fsPath.substr(folder.uri.fsPath.length));

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(folder: vscode.WorkspaceFolder, uris: vscode.Uri[]): vscode.QuickPickItem[] {
    let items: vscode.QuickPickItem[] = [];
    // tslint:disable-next-line:prefer-for-of // Grandfathered in
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(folder, uris[i]));
    }
    return items;
}

async function resolveImageItem(folder: vscode.WorkspaceFolder, dockerFileUri?: vscode.Uri): Promise<Item> {
    if (dockerFileUri) {
        return createItem(folder, dockerFileUri);
    }

    const uris: vscode.Uri[] = await getDockerFileUris(folder);

    if (!uris || uris.length === 0) {
        vscode.window.showInformationMessage('Couldn\'t find a Dockerfile in your workspace.');
        return;
    } else {
        const res: vscode.QuickPickItem = await vscode.window.showQuickPick(computeItems(folder, uris), { placeHolder: 'Choose Dockerfile to build' });
        return <Item>res;
    }

}

export async function buildImage(dockerFileUri?: vscode.Uri): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultContextPath = configOptions.get('imageBuildContextPath', '');

    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }

    if (!folder) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Docker files can only be built if VS Code is opened on a folder.');
        } else {
            vscode.window.showErrorMessage('Docker files can only be built if a workspace folder is picked in VS Code.');
        }
        return;
    }

    const uri: Item = await resolveImageItem(folder, dockerFileUri);
    if (!uri) { return; }

    let contextPath: string = uri.path;
    if (defaultContextPath && defaultContextPath !== '') {
        contextPath = defaultContextPath;
    }

    let imageName: string;
    if (process.platform === 'win32') {
        imageName = uri.path.split('\\').pop().toLowerCase();
    } else {
        imageName = uri.path.split('/').pop().toLowerCase();
    }

    if (imageName === '.') {
        if (process.platform === 'win32') {
            imageName = folder.uri.fsPath.split('\\').pop().toLowerCase();
        } else {
            imageName = folder.uri.fsPath.split('/').pop().toLowerCase();
        }
    }

    const opt: vscode.InputBoxOptions = {
        placeHolder: imageName + ':latest',
        prompt: 'Tag image as...',
        value: imageName + ':latest'
    };

    const value: string = await ext.ui.showInputBox(opt);

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Docker');
    terminal.sendText(`docker build --rm -f "${uri.file}" -t ${value} ${contextPath}`);
    terminal.show();

    if (reporter) {
        /* __GDPR__
           "command" : {
              "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
           }
         */
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
