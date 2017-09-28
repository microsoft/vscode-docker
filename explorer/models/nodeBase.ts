
import * as vscode from 'vscode';

export class NodeBase {
    readonly label: string;

    protected constructor(label: string) {
        this.label = label;
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    async getChildren(element): Promise<NodeBase[]> {
        return [];
    }
}