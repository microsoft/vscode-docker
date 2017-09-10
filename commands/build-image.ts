import * as path from "path";
import * as vscode from "vscode";
import { reporter } from '../telemetry/telemetry';
import { dockerExplorerProvider, DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';

const teleCmdId: string = 'vscode-docker.image.build';

function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

async function getDockerFileUris(): Promise<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return;
    }
    return await vscode.workspace.findFiles(DOCKERFILE_GLOB_PATTERN, null, 1000, null);
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

async function resolveImageItem(dockerFileUri?: vscode.Uri): Promise<Item> {

    if (dockerFileUri) {
        return createItem(dockerFileUri);
    };

    const uris: vscode.Uri[] = await getDockerFileUris();

    if (!uris || uris.length == 0) {
        vscode.window.showInformationMessage('Couldn\'t find a Dockerfile in your workspace.');
        return;
    } else {
        const res: vscode.QuickPickItem = await vscode.window.showQuickPick(computeItems(uris), {placeHolder: 'Choose Dockerfile to build'});
        return <Item>res;
    }

}

export async function buildImage(dockerFileUri?: vscode.Uri) {

    const uri: Item = await resolveImageItem(dockerFileUri);

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

    const value: string = await vscode.window.showInputBox(opt);

    if (!value) return;

    const terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
    terminal.sendText(`docker build -f ${uri.file} -t ${value} ${uri.path}`);
    terminal.show();   
    
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }

    dockerExplorerProvider.refreshImages(false);
    
}