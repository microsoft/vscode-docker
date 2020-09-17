import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";

export class FilesTreeItem extends AzExtParentTreeItem {
    public get contextValue(): string {
        return '';
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return [];
    }

    public get label(): string {
        return 'Files';
    }
}
