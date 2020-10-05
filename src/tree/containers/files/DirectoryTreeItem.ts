import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";
import { AzExtParentTreeItemIntermediate } from '../../AzExtParentTreeItemIntermediate';
import { FileTreeItem } from "./FileTreeItem";

export type DirectoryItemProvider = (path: string | undefined) => Promise<DirectoryItem[]>;

export class DirectoryTreeItem extends AzExtParentTreeItemIntermediate {
    public id?: string ;
    public description?: string = '';

    private children: AzExtTreeItem[] | undefined;

    public constructor(
        parent: AzExtParentTreeItem,
        private readonly fs: vscode.FileSystem,
        private readonly name: string,
        private readonly uri: vscode.Uri) {
        super(parent);
    }

    public get contextValue(): string {
        return '';
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this.children;
    }

    public get iconPath(): vscode.ThemeIcon {
        return (this as vscode.TreeItem).collapsibleState === vscode.TreeItemCollapsibleState.Expanded
            ? new vscode.ThemeIcon('folder-opened')
            : new vscode.ThemeIcon('folder');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this.children = undefined;
        }

        const items = await this.fs.readDirectory(this.uri);

        return items.map(item => this.createTreeItemForDirectoryItem(item));
    }

    private createTreeItemForDirectoryItem(item: [string, vscode.FileType]): AzExtTreeItem {
        const itemUri = vscode.Uri.joinPath(this.uri, item[0]);

        switch (item[1]) {
            case vscode.FileType.Directory: return new DirectoryTreeItem(this, this.fs, item[0], itemUri);
            case vscode.FileType.File: return new FileTreeItem(this, item[0], itemUri);
            default:
                throw new Error('Unrecognized directory item type.');
        }
    }

    public get label(): string {
        return this.name;
    }
}
