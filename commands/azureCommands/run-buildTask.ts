import { TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import vscode = require('vscode');
import { TaskNode } from "../../explorer/models/taskNode";
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';

export async function runBuildTask(context?: TaskNode): Promise<any> {
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

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let runRequest: TaskRunRequest = {
        type: 'Task',
        taskName: taskName
    };

    try {
        await client.registries.scheduleRun(resourceGroup.name, registry.name, runRequest);
    } catch (err) {
        ext.outputChannel.append(err);
    }
    vscode.window.showInformationMessage(`Successfully ran the Task, ${taskName}`);

}
