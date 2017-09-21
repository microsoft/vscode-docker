import * as path from "path";
import * as vscode from "vscode";
import { reporter } from '../telemetry/telemetry';
import { DOCKERFILE_GLOB_PATTERN, dockerExplorerProvider } from '../dockerExtension';

const teleCmdId: string = 'vscode-docker.image.build';

async function getDockerFileUris(folder?: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    if (!folder) {
        return;
    }
    return await vscode.workspace.findFiles(DOCKERFILE_GLOB_PATTERN, null, 1000, null); // TODO@Ben leverage relative pattern support
}

interface Item extends vscode.QuickPickItem {
    file: string,
    path: string
}

function createItem(uri: vscode.Uri, folder?: vscode.WorkspaceFolder): Item {
    let filePath = folder ? path.join(".", uri.fsPath.substr(folder.uri.fsPath.length)) : uri.fsPath;

    return <Item>{
        description: null,
        file: filePath,
        label: filePath,
        path: path.dirname(filePath)
    };
}

function computeItems(uris: vscode.Uri[], folder?: vscode.WorkspaceFolder): vscode.QuickPickItem[] {
    let items: vscode.QuickPickItem[] = [];
    for (let i = 0; i < uris.length; i++) {
        items.push(createItem(uris[i], folder));
    }
    return items;
}

async function resolveImageItem(dockerFileUri?: vscode.Uri, folder?: vscode.WorkspaceFolder): Promise<Item> {

    if (dockerFileUri) {
        return createItem(dockerFileUri, folder);
    };

    const uris: vscode.Uri[] = await getDockerFileUris(folder);

    if (!uris || uris.length == 0) {
        vscode.window.showInformationMessage('Couldn\'t find a Dockerfile in your workspace.');
        return;
    } else {
        const res: vscode.QuickPickItem = await vscode.window.showQuickPick(computeItems(uris, folder), { placeHolder: 'Choose Dockerfile to build' });
        return <Item>res;
    }

}

export async function buildImage(dockerFileUri?: vscode.Uri, ) {
    // TODO need the workspace folder picker here
    let folder: vscode.WorkspaceFolder = void 0;
    const uri: Item = await resolveImageItem(dockerFileUri, folder);

    if (!uri) return;

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

    const value: string = await vscode.window.showInputBox(opt);

    if (!value) return;

    const terminal: vscode.Terminal = vscode.window.createTerminal('Docker');
    terminal.sendText(`docker build --rm -f ${uri.file} -t ${value} ${uri.path}`);
    terminal.show();

    dockerExplorerProvider.refreshImages(true);

    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}