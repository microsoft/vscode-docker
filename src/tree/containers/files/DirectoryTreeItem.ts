import * as vscode from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";
import { DockerUri } from '../../../docker/files/DockerUri';
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
        private readonly uri: DockerUri) {
        super(parent);
    }

    public get contextValue(): string {
        return 'containerDirectory';
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

        const items = await this.fs.readDirectory(this.uri.uri);

        return items.map(item => this.createTreeItemForDirectoryItem(item));
    }

    private createTreeItemForDirectoryItem(item: [string, vscode.FileType]): AzExtTreeItem {
        const name = item[0];
        const fileType = item[1];

        let itemUri = DockerUri.joinPath(this.uri, name);

        switch (fileType) {
            case vscode.FileType.Directory:

                return new DirectoryTreeItem(this, this.fs, name, itemUri);

            case vscode.FileType.File:

                return new FileTreeItem(this, name, itemUri.with({ fileType: 'file' }));

            default:
                throw new Error('Unrecognized directory item type.');
        }
    }

    public get label(): string {
        return this.name;
    }
}
