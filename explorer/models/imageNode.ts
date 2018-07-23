import * as moment from 'moment';
import * as path from 'path';
import * as vscode from 'vscode';
import { trimWithElipsis } from '../utils/utils';
import { NodeBase } from './nodeBase';

export class ImageNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label)
    }

    public imageDesc: Docker.ImageDesc

    public getTreeItem(): vscode.TreeItem {
        let displayName: string = this.label;

        if (vscode.workspace.getConfiguration('docker').get('truncateLongRegistryPaths', false)) {
            if (/\//.test(displayName)) {
                let parts: string[] = this.label.split(/\//);
                displayName = trimWithElipsis(parts[0], vscode.workspace.getConfiguration('docker').get('truncateMaxLength', 10)) + '/' + parts[1];
            }
        }

        displayName = `${displayName} (${moment(new Date(this.imageDesc.Created * 1000)).fromNow()})`;

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "localImageNode",
            iconPath: {
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'application.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'application.svg')
            }
        }
    }

    // no children
}
