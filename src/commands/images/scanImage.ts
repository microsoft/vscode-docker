/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { executeAsTask } from "../../utils/executeAsTask";

export async function scanImageWithAtomist(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.inspect.noImages', 'No images are available to scan')
        });
    }

    await executeAsTask(context, `${ext.dockerContextManager.getDockerCommand(context)} run --platform linux/amd64 -v /var/run/docker.sock:/var/run/docker.sock -ti atomist/docker-registry-broker:0.0.1 index-image local --workspace A051L1L3C --api-key team::75088966728C68A43E9A122AC6A7C156EFCA3F931AF331B68D92A3FE9423389C --image ${node.fullTag}`, 'Atomist Scan', { addDockerEnv: true, focus: true });

}
