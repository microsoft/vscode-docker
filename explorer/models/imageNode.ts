/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getImageLabel } from './getImageLabel';
import { NodeBase } from './nodeBase';

export class ImageNode extends NodeBase {
    constructor(
        public readonly fullTag: string,
        public readonly imageDesc: Docker.ImageDesc,
        public readonly labelTemplate: string
    ) {
        super(getImageLabel(fullTag, imageDesc, labelTemplate));
    }

    public static readonly contextValue: string = 'localImageNode';
    public readonly contextValue: string = ImageNode.contextValue;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }

    // No children
}
