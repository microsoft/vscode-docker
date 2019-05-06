/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { treeUtils } from '../../utils/treeUtils';

export abstract class NodeBase {
    public readonly label: string;
    public abstract readonly contextValue: string;

    protected constructor(label: string) {
        this.label = label;
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        };
    }

    public async getChildren(element: NodeBase): Promise<NodeBase[]> {
        return [];
    }

    public iconPath?: string | vscode.Uri | treeUtils.IThemedIconPath | vscode.ThemeIcon;
}
