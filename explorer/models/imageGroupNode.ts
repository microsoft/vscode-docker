/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { imagesPath } from '../../constants';
import { ImageNode } from './imageNode';
import { NodeBase } from './nodeBase';

export class ImageGroupNode extends NodeBase {

    constructor(
        public readonly label: string
    ) {
        super(label);
    }

    public static readonly contextValue: string = 'localImageGroupNode';
    public readonly contextValue: string = ImageGroupNode.contextValue;

    public readonly children: ImageNode[] = [];

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: {
                light: path.join(imagesPath, 'light', 'application.svg'),
                dark: path.join(imagesPath, 'dark', 'application.svg')
            }
        }
    }

    public async getChildren(): Promise<ImageNode[]> {
        return this.children;
    }
}
