import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import ChildProcessProvider from "../../../debugging/coreclr/ChildProcessProvider";
import { ContainerTreeItem } from "../../../tree/containers/ContainerTreeItem";
import { FileTreeItem } from "../../../tree/containers/files/FileTreeItem";
import { CommandLineBuilder } from "../../../utils/commandLineBuilder";

async function getContainerFileOnLinux(containerId: string, containerPath: string, localPath: string): Promise<void> {
    const command = CommandLineBuilder
        .create('docker', 'cp', `${containerId}:${containerPath}`, localPath)
        .build();

    const processProvider = new ChildProcessProvider();

    await processProvider.exec(command, {});
}

export async function openContainerFile(context: IActionContext, node?: FileTreeItem): Promise<void> {
    let parent = node?.parent;

    while (parent && !(parent instanceof ContainerTreeItem)) {
        parent = parent.parent;
    }

    if (parent) {
        const containerNode = <ContainerTreeItem>parent;

        const localPath = path.join(os.tmpdir(), 'docker-test.txt' /* TODO: Use better file name */);

        await getContainerFileOnLinux(containerNode.containerId, node.path, localPath);

        const document = await vscode.workspace.openTextDocument(localPath);

        await vscode.window.showTextDocument(document);
    }
}
