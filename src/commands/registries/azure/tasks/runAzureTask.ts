/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementModels as AcrModels } from "@azure/arm-containerregistry";
import { window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { localize } from "../../../../localize";
import { AzureTaskTreeItem } from "../../../../tree/registries/azure/AzureTaskTreeItem";

export async function runAzureTask(context: IActionContext, node?: AzureTaskTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<AzureTaskTreeItem>(AzureTaskTreeItem.contextValue, context);
    }

    const registryTI = node.parent.parent;
    let runRequest: AcrModels.TaskRunRequest = { type: 'TaskRunRequest', taskId: node.id };
    let run = await registryTI.client.registries.scheduleRun(registryTI.resourceGroup, registryTI.registryName, runRequest);
    await node.parent.refresh();
    // don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    window.showInformationMessage(localize('vscode-docker.commands.registries.azure.tasks.runTaskScheduled', 'Successfully scheduled run "{0}" for task "{1}".', run.runId, node.taskName));
}
