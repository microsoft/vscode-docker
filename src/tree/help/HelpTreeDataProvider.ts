/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import TreeNode from '../TreeItem';
import GetStartedNode from './GetStartedNode';
import ReadDocumentationNode from './readDocumentationNode';
import ReportIssueNode from './ReportIssueNode';
import ReviewIssuesNode from './ReviewIssuesNode';

export default class HelpTreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
    public getTreeItem(element: TreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }

    public getChildren(element: TreeNode): vscode.ProviderResult<TreeNode[]> {
        return [
            new GetStartedNode(),
            new ReadDocumentationNode(),
            new ReviewIssuesNode(),
            new ReportIssueNode()
        ];
    }
}
