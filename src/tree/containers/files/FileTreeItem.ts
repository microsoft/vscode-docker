import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { DirectoryItem } from "../../../docker/DockerContainerDirectoryProvider";

export class FileTreeItem extends AzExtTreeItem {
    public constructor(parent: AzExtParentTreeItem, private readonly item: DirectoryItem) {
        super(parent);
    }

    public get contextValue(): string {
        return '';
    }

    public get label(): string {
        return this.item.name;
    }
}
