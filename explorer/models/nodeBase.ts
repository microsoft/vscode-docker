/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export type IconPath = string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon;

export abstract class NodeBase {
    public readonly label: string;
    public abstract readonly contextValue: string;

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

    public iconPath?: IconPath;
}
