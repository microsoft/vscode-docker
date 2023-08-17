/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, contextValueExperience } from '@microsoft/vscode-azext-utils';
import { CommonRegistry, CommonRepository, CommonTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getImageNameFromRegistryTagItem } from '../../tree/registries/registryTreeUtils';
import { logInToDockerCli } from './logInToDockerCli';

export async function pullRepository(context: IActionContext, node?: UnifiedRegistryItem<CommonRepository>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: 'commonrepository' });
    }

    await pullImages(context, node.parent, node.wrappedItem.label, true);
}

export async function pullImageFromRepository(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await contextValueExperience(context, ext.registriesTree, { include: 'commontag' });
    }

    await pullImages(context, node.parent.parent, getImageNameFromRegistryTagItem(node.wrappedItem), false);
}

async function pullImages(context: IActionContext, node: UnifiedRegistryItem<unknown>, imageRequest: string, allTags: boolean): Promise<void> {
    const registryNode = node as UnifiedRegistryItem<CommonRegistry>;
    await logInToDockerCli(context, registryNode);

    const client = await ext.runtimeManager.getClient();
    const taskCRF = new TaskCommandRunnerFactory({
        taskName: client.displayName,
    });

    await taskCRF.getCommandRunner()(
        client.pullImage(
            {
                imageRef: `${registryNode.wrappedItem.label}/${imageRequest}`,
                allTags: allTags,
            }
        )
    );
}
