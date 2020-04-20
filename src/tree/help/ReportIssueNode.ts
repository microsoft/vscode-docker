/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { localize } from '../../localize';
import TreeNode from '../TreeItem';

export default class ReportIssueNode implements TreeNode {
    public async getTreeItem(): Promise<vscode.TreeItem> {
        const treeItem = new vscode.TreeItem(localize('views.help.reportIssue', 'Report Issue'));

        treeItem.command = {
            arguments: [this],
            command: 'vscode-docker.help.reportIssue',
            title: '' // NOTE: Title is required but unused here.
        };

        treeItem.iconPath = new vscode.ThemeIcon('comment');

        return Promise.resolve(treeItem);
    }
}
