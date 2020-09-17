import { AzExtParentTreeItem } from "vscode-azureextensionui";
import { DirectoryItemProvider, DirectoryTreeItem } from "./DirectoryTreeItem";

export class FilesTreeItem extends DirectoryTreeItem {
    public constructor(parent: AzExtParentTreeItem, itemProvider: DirectoryItemProvider) {
        super(parent, undefined, itemProvider);
    }

    public get contextValue(): string {
        return '';
    }

    public get label(): string {
        return 'Files';
    }
}
