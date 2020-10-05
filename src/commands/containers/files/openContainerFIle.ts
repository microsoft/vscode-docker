import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { FileTreeItem } from "../../../tree/containers/files/FileTreeItem";

/*
    // TODO: Remove this.
async function getContainerFileOnLinux(containerId: string, containerPath: string, localPath: string): Promise<void> {
    const command = CommandLineBuilder
        .create('docker', 'cp', `${containerId}:${containerPath}`, localPath)
        .build();

    await execAsync(command, {});
}
*/

export async function openContainerFile(context: IActionContext, node?: FileTreeItem): Promise<void> {
    if (node) {
        const document = await vscode.workspace.openTextDocument(node.uri);

        await vscode.window.showTextDocument(document);
    }
}
