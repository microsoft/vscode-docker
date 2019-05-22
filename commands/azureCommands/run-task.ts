import { Registry } from "azure-arm-containerregistry/lib/models";
import { TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import vscode = require('vscode');
import { IActionContext, parseError } from "vscode-azureextensionui";
import { TaskNode } from "../../explorer/models/taskNode";
import * as acrTools from '../../src/utils/Azure/acrTools';
import { AzureUtilityManager } from "../../src/utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';
import { scheduleRunRequest } from '../utils/SourceArchiveUtility';

// Runs the selected yaml file. Equivalent to az acr run -f <yaml file> <directory>
// Selected source code must contain a path to the desired dockerfile.
export async function runTaskFile(context: IActionContext, yamlFileUri?: vscode.Uri): Promise<void> {
    await scheduleRunRequest(yamlFileUri, "FileTaskRunRequest", context);
}

export async function runTask(_context: IActionContext, node?: TaskNode): Promise<void> {
    let taskName: string;
    let subscription: Subscription;
    let resourceGroup: ResourceGroup;
    let registry: Registry;

    if (node) { // Right Click
        subscription = node.subscription;
        registry = node.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        taskName = node.task.name;
    } else { // Command Palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry(false, subscription);
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        taskName = (await quickPickTask(registry, subscription, resourceGroup)).name;
    }

    const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let runRequest: TaskRunRequest = {
        type: 'TaskRunRequest',
        taskName: taskName
    };

    try {
        let taskRun = await client.registries.scheduleRun(resourceGroup.name, registry.name, runRequest);
        vscode.window.showInformationMessage(`Successfully scheduled the Task '${taskName}' with ID '${taskRun.runId}'.`);
    } catch (err) {
        throw new Error(`Failed to schedule the Task '${taskName}'\nError: '${parseError(err).message}'`);
    }
}
