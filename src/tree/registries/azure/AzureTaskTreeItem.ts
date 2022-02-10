/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Task as AcrTask, TaskRun as AcrTaskRun } from "@azure/arm-containerregistry"; // These are only dev-time imports so don't need to be lazy
import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { localize } from '../../../localize';
import { getAzExtAzureUtils } from "../../../utils/lazyPackages";
import { nonNullValue, nonNullValueAndProp } from "../../../utils/nonNull";
import { AzureRegistryTreeItem } from "./AzureRegistryTreeItem";
import { AzureTaskRunTreeItem } from "./AzureTaskRunTreeItem";
import { AzureTasksTreeItem } from "./AzureTasksTreeItem";

export class AzureTaskTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureTask';
    private static _noTaskFilter: string = 'TaskName eq null';
    public childTypeLabel: string = 'task run';
    public parent: AzureTasksTreeItem;

    private _task: AcrTask | undefined;

    public constructor(parent: AzureTasksTreeItem, task: AcrTask | undefined) {
        super(parent);
        this._task = task;
        this.iconPath = new ThemeIcon('tasklist');
        this.id = this._task ? this._task.id : undefined;
    }

    public get contextValue(): string {
        return this._task ? AzureTaskTreeItem.contextValue : 'azureRunsWithoutTask';
    }

    public get label(): string {
        return this._task ? this.taskName : localize('vscode-docker.tree.registries.azure.runsWithoutTask', 'Runs without a task');
    }

    public get taskName(): string {
        return nonNullValueAndProp(this._task, 'name');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public get properties(): unknown {
        return nonNullValue(this._task, '_task');
    }

    public static async hasRunsWithoutTask(context: IActionContext, registryTI: AzureRegistryTreeItem): Promise<boolean> {
        const runListResult = await AzureTaskTreeItem.getTaskRuns(context, registryTI, AzureTaskTreeItem._noTaskFilter);
        return runListResult.length > 0;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        const filter = this._task ? `TaskName eq '${this.taskName}'` : AzureTaskTreeItem._noTaskFilter;
        const runListResult = await AzureTaskTreeItem.getTaskRuns(context, this.parent.parent, filter);

        if (clearCache && runListResult.length === 0 && this._task) {
            const ti = new GenericTreeItem(this, {
                label: localize('vscode-docker.tree.registries.azure.runTask', 'Run Task...'),
                commandId: 'vscode-docker.registries.azure.runTask',
                contextValue: 'runTask'
            });
            ti.commandArgs = [this];
            return [ti];
        } else {
            return await this.createTreeItemsWithErrorHandling(
                runListResult,
                'invalidAzureTaskRun',
                async r => new AzureTaskRunTreeItem(this, r),
                r => r.name
            );
        }
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof AzureTaskRunTreeItem && ti2 instanceof AzureTaskRunTreeItem && ti1.createTime && ti2.createTime) {
            return ti2.createTime.valueOf() - ti1.createTime.valueOf();
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    private static async getTaskRuns(context: IActionContext, registryTI: AzureRegistryTreeItem, filter: string): Promise<AcrTaskRun[]> {
        const azExtAzureUtils = await getAzExtAzureUtils();
        const registryClient = await registryTI.getClient(context);

        return await azExtAzureUtils.uiUtils.listAllIterator(registryClient.runs.list(registryTI.resourceGroup, registryTI.registryName, { filter }));
    }
}
