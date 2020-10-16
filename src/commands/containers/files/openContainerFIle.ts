import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { FileTreeItem } from "../../../tree/containers/files/FileTreeItem";

export async function openContainerFile(context: IActionContext, node?: FileTreeItem): Promise<void> {
    if (node) {
        const document = await vscode.workspace.openTextDocument(node.uri.uri);

        await vscode.window.showTextDocument(document);
    }
}
