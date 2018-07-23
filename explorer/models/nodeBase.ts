import * as vscode from 'vscode';

export class NodeBase {
    public readonly label: string;
    public readonly contextValue: string;

    protected constructor(label: string) {
        this.label = label;
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    public async getChildren(element: NodeBase): Promise<NodeBase[]> {
        return [];
    }

    public iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri };
}
