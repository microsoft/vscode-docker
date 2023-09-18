/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CommonRegistry, CommonRepository, CommonTag } from '@microsoft/vscode-docker-registries/lib/clients/Common/models';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { UnifiedRegistryItem } from '../../tree/registries/UnifiedRegistryTreeDataProvider';
import { getFullImageNameFromRegistryTagItem, getFullRepositoryNameFromRepositoryItem } from '../../tree/registries/registryTreeUtils';
import { registryExperience } from '../../utils/registryExperience';
import { logInToDockerCli } from './logInToDockerCli';

export async function pullRepository(context: IActionContext, node?: UnifiedRegistryItem<CommonRepository>): Promise<void> {
    if (!node) {
        node = await registryExperience<CommonRepository>(context, { contextValueFilter: { include: /commonrepository/i } });
    }

    await pullImages(context, node.parent, getFullRepositoryNameFromRepositoryItem(node.wrappedItem), true);
}

export async function pullImageFromRepository(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
    if (!node) {
        node = await registryExperience<CommonTag>(context, { contextValueFilter: { include: /commontag/i } });
    }

    await pullImages(context, node.parent.parent, getFullImageNameFromRegistryTagItem(node.wrappedItem), false);
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
                imageRef: imageRequest,
                allTags: allTags,
            }
        )
    );
}
