/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { trimWithElipsis } from '../utils/utils';
import { getImageOrContainerDisplayName } from './getImageOrContainerDisplayName';
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
        let config = vscode.workspace.getConfiguration('docker');
        let displayName: string = getImageOrContainerDisplayName(this.label, config.get('truncateLongRegistryPaths'), config.get('truncateMaxLength'));

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }
}
