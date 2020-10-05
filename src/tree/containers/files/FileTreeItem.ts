import * as vscode from 'vscode';
import { AzExtParentTreeItem } from "vscode-azureextensionui";
import { AzExtTreeItemIntermediate } from '../../AzExtTreeItemIntermediate';

export class FileTreeItem extends AzExtTreeItemIntermediate {
    public id?: string;
    public description?: string = '';

    public constructor(
        parent: AzExtParentTreeItem,
        private readonly name: string,
        public readonly uri: vscode.Uri) {
        super(parent);
    }

    public get contextValue(): string {
        return 'containerFile';
    }

    public get iconPath(): vscode.ThemeIcon {
        return new vscode.ThemeIcon('file');
    }

    public get label(): string {
        return this.name;
    }
}
