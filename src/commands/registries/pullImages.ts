/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';
import { RemoteRepositoryTreeItemBase } from '../../tree/registries/RemoteRepositoryTreeItemBase';
import { RemoteTagTreeItem } from '../../tree/registries/RemoteTagTreeItem';
import { logInToDockerCli } from './logInToDockerCli';

export async function pullRepository(context: IActionContext, node?: RemoteRepositoryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteRepositoryTreeItemBase>(registryExpectedContextValues.all.repository, context);
    }

    await pullImages(context, node.parent, node.repoName, true);
}

export async function pullImageFromRepository(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>(registryExpectedContextValues.all.tag, context);
    }

    await pullImages(context, node.parent.parent, node.repoNameAndTag, false);
}

async function pullImages(context: IActionContext, node: RegistryTreeItemBase, imageRequest: string, allTags: boolean): Promise<void> {
    await logInToDockerCli(context, node);

    const client = await ext.runtimeManager.getClient();
    const taskCRF = new TaskCommandRunnerFactory({
        taskName: client.displayName,
    });

    await taskCRF.getCommandRunner()(
        client.pullImage(
            {
                imageRef: `${node.baseImagePath}/${imageRequest}`,
                allTags: allTags,
            }
        )
    );
}
