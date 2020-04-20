/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { localize } from '../../localize';
import { OpenUrlTreeItem } from '../OpenUrlTreeItem';
import TreeNode from "../TreeItem";

export default class ReadDocumentationNode implements TreeNode {
    public async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new OpenUrlTreeItem(
            localize('views.help.readDocumentation', 'Read Documentation'),
            'https://aka.ms/helppanel_docs',
            new vscode.ThemeIcon('book'));
        return Promise.resolve(treeItem);
    }
}
