import * as vscode from 'vscode';
import { AzExtParentTreeItem } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";
import { AzExtTreeItemIntermediate } from '../../AzExtTreeItemIntermediate';

export class FileTreeItem extends AzExtTreeItemIntermediate {
    public id?: string;
    public description?: string = '';

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
