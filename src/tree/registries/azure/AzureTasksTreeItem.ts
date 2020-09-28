/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementModels as AcrModels } from "@azure/arm-containerregistry";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { localize } from '../../../localize';
import { getThemedIconPath } from "../../IconPath";
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
        this.iconPath = getThemedIconPath('tasks');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const registryTI = this.parent;

        let taskListResult: AcrModels.TaskListResult = this._nextLink === undefined ?
            await registryTI.client.tasks.list(registryTI.resourceGroup, registryTI.registryName) :
            await registryTI.client.tasks.listNext(this._nextLink);

        this._nextLink = taskListResult.nextLink;

        if (clearCache && taskListResult.length === 0) {
            return [new OpenUrlTreeItem(this, localize('vscode-docker.tree.registries.azure.learnBuildTask', 'Learn how to create a build task...'), 'https://aka.ms/acr/task')]
        } else {
            let result: AzExtTreeItem[] = await this.createTreeItemsWithErrorHandling(
                taskListResult,
                'invalidAzureTask',
                async t => new AzureTaskTreeItem(this, t),
                t => t.name
            );

            if (clearCache) {
                // If there are any runs _not_ associated with a task (e.g. the user ran a task from a local Dockerfile) add a tree item to display those runs
                if (await AzureTaskTreeItem.hasRunsWithoutTask(this.parent)) {
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
