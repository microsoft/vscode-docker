/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { trimWithElipsis } from '../utils/utils';
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
