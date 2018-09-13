import { BuildTaskBuildRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import vscode = require('vscode');
import { BuildTaskNode } from "../../explorer/models/taskNode";
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickBuildTask, quickPickSubscription } from '../utils/quick-pick-azure';

export async function runBuildTask(context?: BuildTaskNode): Promise<any> {
    let buildTaskName: string;
    let subscription: Subscription;
    let resourceGroup: ResourceGroup;
    let registry: Registry;

    if (context) { // Right Click
        subscription = context.subscription;
        registry = context.registry;
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        buildTaskName = context.task.name;
    } else { // Command Palette
        subscription = await quickPickSubscription();
        registry = await quickPickACRRegistry();
        resourceGroup = await acrTools.getResourceGroup(registry, subscription);
        buildTaskName = (await quickPickBuildTask(registry, subscription, resourceGroup)).name;
    }

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let buildRequest: BuildTaskBuildRequest = {
        'type': 'BuildTask',
        'buildTaskName': buildTaskName
    };

    try {
        await client.registries.queueBuild(resourceGroup.name, registry.name, buildRequest);
    } catch (err) {
        ext.outputChannel.append(err);
    }
    vscode.window.showInformationMessage(`Successfully ran the Build Task, ${buildTaskName}`);

}
