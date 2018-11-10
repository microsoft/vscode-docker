import { FileTaskRunRequest, Run, TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import * as fse from 'fs-extra';
import vscode = require('vscode');
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { parseError } from "vscode-azureextensionui";
import { TaskNode } from "../../explorer/models/taskNode";
import { ext } from "../../extensionVariables";
import * as acrTools from '../../utils/Azure/acrTools';
import { getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';
import { quickPickYamlFileItem } from "../utils/quick-pick-image";
import { quickPickWorkspaceFolder } from "../utils/quickPickWorkspaceFolder";
import { getTempSourceArchivePath, uploadSourceCode } from '../utils/SourceArchiveUtility';

const status = vscode.window.createOutputChannel('Run ACR Task status');

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

// Runs the selected yaml file. Equivalent to az acr run -f <yaml file> <directory>
// Selected source code must contain a path to the desired dockerfile.
export async function runTaskFile(yamlFileUri?: vscode.Uri): Promise<void> {
    //Acquire information from user
    let rootFolder: vscode.WorkspaceFolder = await quickPickWorkspaceFolder("To run a task from a Yaml file you must first open a folder or workspace in VS Code.");
    const yamlItem = await quickPickYamlFileItem(yamlFileUri, rootFolder);
    const subscription = await quickPickSubscription();
    const registry: Registry = await quickPickACRRegistry(true);
    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;

    const resourceGroupName = getResourceGroupName(registry);
    const tarFilePath = getTempSourceArchivePath(status);
    const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);

    //Begin readying build
    status.show();

    const uploadedSourceLocation: string = await uploadSourceCode(status, client, registry.name, resourceGroupName, rootFolder, tarFilePath);
    status.appendLine("Uploaded Source Code to " + tarFilePath);

    const runRequest: FileTaskRunRequest = {
        type: 'FileTaskRunRequest',
        taskFilePath: yamlItem.relativeFilePath,
        sourceLocation: uploadedSourceLocation,
        platform: { os: osType }
    }
    status.appendLine("Set up Run Request");

    const run: Run = await client.registries.scheduleRun(resourceGroupName, registry.name, runRequest);
    status.appendLine("Schedule Run " + run.runId);

    await streamLogs(registry, run, status, client);
    await fse.unlink(tarFilePath);
}
