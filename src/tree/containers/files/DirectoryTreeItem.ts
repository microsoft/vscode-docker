import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";
import { FileTreeItem } from "./FileTreeItem";

export type DirectoryItemProvider = (path: string | undefined) => Promise<DirectoryItem[]>;

export class DirectoryTreeItem extends AzExtParentTreeItem {
    private children: AzExtTreeItem[] | undefined;

    public constructor(
        parent: AzExtParentTreeItem,
        private readonly item: DirectoryItem | undefined,
        private readonly itemProvider: DirectoryItemProvider) {
        super(parent);
    }

    public get contextValue(): string {
        return '';
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this.children;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this.children = undefined;
        }

        const items = await this.itemProvider(this.item?.path);

        return items.map(item => this.createTreeItemForDirectoryItem(item));
    }

    private createTreeItemForDirectoryItem(item: DirectoryItem): AzExtTreeItem {
        switch (item.type) {
            case 'directory': return new DirectoryTreeItem(this, item, this.itemProvider);
            case 'file': return new FileTreeItem(this, item);
            default:
                throw new Error('Unrecognized directory item type.');
        }
    }

    public get label(): string {
        return this.item?.name ?? '<Unknown>';
    }
}
