import { TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import vscode = require('vscode');
import { parseError } from "vscode-azureextensionui";
import { TaskNode } from "../../explorer/models/taskNode";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';
import { scheduleRunRequest } from '../utils/SourceArchiveUtility';

// Runs the selected yaml file. Equivalent to az acr run -f <yaml file> <directory>
// Selected source code must contain a path to the desired dockerfile.
export async function runTaskFile(yamlFileUri?: vscode.Uri): Promise<void> {
    scheduleRunRequest(yamlFileUri, "FileTaskRunRequest");
}

export async function runTask(context?: TaskNode): Promise<void> {
    let taskName: string;
    let subscription: Subscription;
    let resourceGroup: ResourceGroup;
    let registry: Registry;

    if (context) { // Right Click
        subscription = context.subscription;
        registry = context.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        taskName = context.task.name;
    } else { // Command Palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry();
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
