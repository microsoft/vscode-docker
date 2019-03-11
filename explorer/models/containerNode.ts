/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IconPath, NodeBase } from './nodeBase';

export type ContainerNodeContextValue = 'stoppedLocalContainerNode' | 'runningLocalContainerNode';

export class ContainerNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly containerDesc: Docker.ContainerDesc,
        public readonly contextValue: ContainerNodeContextValue,
        public readonly iconPath: IconPath
    ) {
        super(label)
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }
}
