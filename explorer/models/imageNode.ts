import * as vscode from 'vscode';
import * as path from 'path';
import * as moment from 'moment';
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

    getTreeItem(): vscode.TreeItem {
        return {
            label: `${this.label} (${moment(new Date(this.imageDesc.Created * 1000)).fromNow()})`,
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