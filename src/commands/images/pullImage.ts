/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { executeAsTask } from '../../utils/executeAsTask';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function pullImage(context: IActionContext, node?: ImageTreeItem, nodes?: ImageTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: localize('vscode-docker.commands.images.pull.noImages', 'No images are available to pull') },
        ext.imagesTree,
        ImageTreeItem.contextValue,
        node,
        nodes
    );

    for (const n of nodes) {
        await executeAsTask(context, `docker pull ${n.fullTag}`, 'docker pull', { addDockerEnv: true });
    }
}
