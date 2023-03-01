/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function selectContainer(context: IActionContext): Promise<string> {
    // Expecting running containers to change often as this is a debugging scenario.
    await ext.containersTree.refresh(context);

    const node: ContainerTreeItem = await ext.containersTree.showTreeItemPicker(ContainerTreeItem.runningContainerRegExp, {
        ...context,
        noItemFoundErrorMessage: l10n.t('No running containers are available')
    });

    return node.containerId;
}
