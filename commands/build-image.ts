import * as path from "path";
import * as vscode from "vscode";
import { DialogResponses, IActionContext, UserCancelledError } from "vscode-azureextensionui";
import { DOCKERFILE_GLOB_PATTERN } from '../dockerExtension';
import { ext } from "../extensionVariables";

async function getDockerFileUris(folder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(folder, DOCKERFILE_GLOB_PATTERN), undefined, 1000, undefined);
}

interface Item extends vscode.QuickPickItem {
    fileName: string;
    folderPath: string;
}

function createItem(folder: vscode.WorkspaceFolder, uri: vscode.Uri): Item {
    let filePath = path.join(".", uri.fsPath.substr(folder.uri.fsPath.length));

    return <Item>{
        description: undefined,
        fileName: filePath,
        label: filePath,
        folderPath: path.dirname(filePath)
    };
}

function createItems(folder: vscode.WorkspaceFolder, uris: vscode.Uri[]): Item[] {
    let items: Item[] = uris.map(uri => createItem(folder, uri));
    return items;
}

async function resolveImageItem(folder: vscode.WorkspaceFolder, dockerFileUri?: vscode.Uri): Promise<Item | undefined> {
    if (dockerFileUri) {
        return createItem(folder, dockerFileUri);
    }

    const uris: vscode.Uri[] = await getDockerFileUris(folder);

    if (!uris || uris.length === 0) {
        return undefined;
    } else {
        let items = createItems(folder, uris);
        if (items.length === 1) {
            return items[0];
        } else {
            const res: vscode.QuickPickItem = await ext.ui.showQuickPick(items, { placeHolder: 'Choose Dockerfile to build' });
            return <Item>res;
        }
    }
}

export async function buildImage(actionContext: IActionContext, dockerFileUri?: vscode.Uri): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultContextPath = configOptions.get('imageBuildContextPath', '');
    let dockerFileItem: Item | undefined;

    let workspaceFolder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        workspaceFolder = vscode.workspace.workspaceFolders[0];
    } else {
        let selected = await vscode.window.showWorkspaceFolderPick();
        if (!selected) {
            throw new UserCancelledError();
        }
        workspaceFolder = selected;
    }

    if (!workspaceFolder) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage('Docker files can only be built if VS Code is opened on a folder.');
        } else {
            vscode.window.showErrorMessage('Docker files can only be built if a workspace folder is picked in VS Code.');
        }
        return;
    }

    while (!dockerFileItem) {
        let resolvedItem: Item | undefined = await resolveImageItem(workspaceFolder, dockerFileUri);
        if (resolvedItem) {
            dockerFileItem = resolvedItem;
        } else {
            let msg = "Couldn't find a Dockerfile in your workspace. Would you like to add Docker files to the workspace?";
            let response = await ext.ui.showWarningMessage(msg, DialogResponses.yes, DialogResponses.no);
            if (response === DialogResponses.no) {
                actionContext.properties.cancelStep = msg;
                throw new UserCancelledError();
            } else {
                await vscode.commands.executeCommand('vscode-docker.configure');
                // Try again
            }
        }
    }

    let contextPath: string = dockerFileItem.folderPath;
    if (defaultContextPath && defaultContextPath !== '') {
        contextPath = defaultContextPath;
    }

    // Get imageName based on name of subfolder containing the Dockerfile, or else workspacefolder
    let imageName: string;
    imageName = path.basename(dockerFileItem.folderPath).toLowerCase();
    if (imageName === '.') {
        imageName = path.basename(workspaceFolder.uri.fsPath).toLowerCase();
    }

    const opt: vscode.InputBoxOptions = {
        placeHolder: imageName + ':latest',
        prompt: 'Tag image as...',
        value: imageName + ':latest'
    };

    const value: string = await ext.ui.showInputBox(opt);

    const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Docker');
    terminal.sendText(`docker build --rm -f "${dockerFileItem.fileName}" -t ${value} ${contextPath}`);
    terminal.show();
}
