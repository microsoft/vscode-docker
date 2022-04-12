/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RemoteTagTreeItem } from '../../tree/registries/RemoteTagTreeItem';

export async function copyRemoteFullTag(context: IActionContext, node?: RemoteTagTreeItem): Promise<string> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerV2.tag, registryExpectedContextValues.dockerHub.tag], {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.registries.copyRemoteFullTag.noImages', 'No remote images are available to copy the full tag')
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    // Don't wait
    void vscode.env.clipboard.writeText(node.fullTag);
    return node.fullTag;
}
