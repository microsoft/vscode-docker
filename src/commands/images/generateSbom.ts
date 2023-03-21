/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

export async function generateSbom(context: IActionContext, node?: ImageTreeItem): Promise<string> {


    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    vscode.env.clipboard.writeText(node.fullTag);
    return node.fullTag;
}
