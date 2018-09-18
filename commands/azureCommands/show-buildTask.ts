import { Registry } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import { TaskNode } from "../../explorer/models/taskNode";
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';
import { openTask } from "./task-utils/showTaskManager";

export async function showBuildTaskProperties(context?: TaskNode): Promise<any> {
    let subscription: Subscription;
    let registry: Registry;
    let resourceGroup: ResourceGroup;
    let task: string;

    if (context) { // Right click
        subscription = context.subscription;
        registry = context.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        task = context.task.name;
    } else { // Command palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry();
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        task = (await quickPickTask(registry, subscription, resourceGroup)).name;
    }

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let item: any = await client.tasks.get(resourceGroup.name, registry.name, task);

    /*
    try {
        const steps = await client.buildSteps.get(resourceGroup.name, registry.name, buildTask, `${buildTask}StepName`);
        item.properties = steps;
    } catch (error) {
        ext.outputChannel.append(error);
        ext.outputChannel.append("Build Step not available for this image due to update in API");
    }
    */

    let indentation = 1;
    let replacer;
    openTask(JSON.stringify(item, replacer, indentation), task);
}
