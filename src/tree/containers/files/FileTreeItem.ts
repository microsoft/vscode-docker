import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";

export class FileTreeItem extends AzExtTreeItem {
    public constructor(parent: AzExtParentTreeItem, private readonly item: DirectoryItem) {
        super(parent);
    }

    public get contextValue(): string {
        return 'containerFile';
    }

    public get iconPath(): vscode.ThemeIcon {
        return new vscode.ThemeIcon('file');
    }

    public get label(): string {
        return this.item.name;
    }

    public get path(): string {
        return this.item.path;
    }
}
