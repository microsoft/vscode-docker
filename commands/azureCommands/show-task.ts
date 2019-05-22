import { Registry, Task } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import { IActionContext } from "vscode-azureextensionui";
import { TaskNode } from "../../explorer/models/taskNode";
import * as acrTools from '../../src/utils/Azure/acrTools';
import { AzureUtilityManager } from "../../src/utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';
import { openTask } from "./task-utils/showTaskManager";

export async function showTaskProperties(_context: IActionContext, node?: TaskNode): Promise<void> {
    let subscription: Subscription;
    let registry: Registry;
    let resourceGroup: ResourceGroup;
    let task: string;

    if (node) { // Right click
        subscription = node.subscription;
        registry = node.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        task = node.task.name;
    } else { // Command palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry(false, subscription);
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        task = (await quickPickTask(registry, subscription, resourceGroup)).name;
    }

    const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let item: Task = await client.tasks.get(resourceGroup.name, registry.name, task);
    let indentation = 2;
    openTask(JSON.stringify(item, undefined, indentation), task);
}
