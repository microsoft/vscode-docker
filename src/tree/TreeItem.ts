/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TreeItem } from "vscode";

export default interface TreeNode {
    getTreeItem(): Promise<TreeItem>;
}
