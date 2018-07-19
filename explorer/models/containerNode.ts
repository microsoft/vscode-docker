import * as vscode from 'vscode';
import { trimWithElipsis } from '../utils/utils';
import { NodeBase } from './nodeBase';

export class ContainerNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label)
    }

    public containerDesc: Docker.ContainerDesc;

    public getTreeItem(): vscode.TreeItem {
        let displayName: string = this.label;

        if (vscode.workspace.getConfiguration('docker').get('truncateLongRegistryPaths', false)) {
            if (/\//.test(displayName)) {
                let parts: string[] = this.label.split(/\//);
                displayName = trimWithElipsis(parts[0], vscode.workspace.getConfiguration('docker').get('truncateMaxLength', 10)) + '/' + parts[1];
            }
        }

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }
}
