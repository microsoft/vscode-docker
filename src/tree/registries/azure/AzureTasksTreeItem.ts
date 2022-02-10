/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Task } from "@azure/arm-containerregistry"; // These are only dev-time imports so don't need to be lazy
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { localize } from '../../../localize';
import { getAzExtAzureUtils } from "../../../utils/lazyPackages";
import { OpenUrlTreeItem } from "../../OpenUrlTreeItem";
import { AzureRegistryTreeItem } from "./AzureRegistryTreeItem";
import { AzureTaskTreeItem } from "./AzureTaskTreeItem";

export class AzureTasksTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureTasks';
    public contextValue: string = AzureTasksTreeItem.contextValue;
    public label: string = 'Tasks';
    public childTypeLabel: string = 'task';
    public parent: AzureRegistryTreeItem;

    private _nextLink: string | undefined;

    public constructor(parent: AzureRegistryTreeItem) {
        super(parent);
        this.iconPath = new ThemeIcon('checklist');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const registryTI = this.parent;

        const azExtAzureUtils = await getAzExtAzureUtils();
        const registryClient = await registryTI.getClient(context);

        const taskListResult: Task[] = await azExtAzureUtils.uiUtils.listAllIterator(registryClient.tasks.list(registryTI.resourceGroup, registryTI.registryName));

        if (clearCache && taskListResult.length === 0) {
            return [new OpenUrlTreeItem(this, localize('vscode-docker.tree.registries.azure.learnBuildTask', 'Learn how to create a build task...'), 'https://aka.ms/acr/task')];
        } else {
            const result: AzExtTreeItem[] = await this.createTreeItemsWithErrorHandling(
                taskListResult,
                'invalidAzureTask',
                async t => new AzureTaskTreeItem(this, t),
                t => t.name
            );

            if (clearCache) {
                // If there are any runs _not_ associated with a task (e.g. the user ran a task from a local Dockerfile) add a tree item to display those runs
                if (await AzureTaskTreeItem.hasRunsWithoutTask(context, this.parent)) {
                    result.push(new AzureTaskTreeItem(this, undefined));
                }
            }

            return result;
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
        if (expectedContextValue instanceof RegExp) {
            expectedContextValue = expectedContextValue.source.toString();
        }

        return expectedContextValue.toLowerCase().includes('task');
    }
}
