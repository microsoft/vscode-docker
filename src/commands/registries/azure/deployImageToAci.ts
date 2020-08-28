/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { executeAsTask } from '../../../utils/executeAsTask';
import { addImageTaggingTelemetry } from '../../images/tagImage';

export async function deployImageToAci(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    // We're already in an ACI context or the command would not show

    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    addImageTaggingTelemetry(context, node.fullTag, '');

    // Log in to the registry to ensure the run actually succeeds
    // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
    await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', node.parent.parent);

    await executeAsTask(
        context,
        `docker run -d ${node.fullTag}`,
        localize('vscode-docker.commands.registries.deployImageToAci.deploy', 'Deploy to ACI'),
        {
            addDockerEnv: false,
        }
    );
}
