/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { UnifiedRegistryItem } from "../../../../tree/registries/UnifiedRegistryTreeDataProvider";

export async function runAzureTask(context: IActionContext, node?: UnifiedRegistryItem<unknown>): Promise<void> {
    // if (!node) {
    //     node = await ext.registriesTree.showTreeItemPicker<AzureTaskTreeItem>(AzureTaskTreeItem.contextValue, context);
    // }

    // const registryTI = node.parent.parent;
    // const runRequest: TaskRunRequest = { type: 'TaskRunRequest', taskId: node.id };
    // const run = await (await registryTI.getClient(context)).registries.beginScheduleRunAndWait(registryTI.resourceGroup, registryTI.registryName, runRequest);
    // await node.parent.refresh(context);
    // // don't wait
    // /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    // window.showInformationMessage(l10n.t('Successfully scheduled run "{0}" for task "{1}".', run.runId, node.taskName));
}
