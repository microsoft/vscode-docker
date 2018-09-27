import { TaskRunRequest } from "azure-arm-containerregistry/lib/models";
import { Registry } from "azure-arm-containerregistry/lib/models";
import { FileTaskRunRequest } from "azure-arm-containerregistry/lib/models/fileTaskRunRequest";
import { ResourceGroup } from "azure-arm-resource/lib/resource/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import vscode = require('vscode');
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { TaskNode } from "../../explorer/models/taskNode";
import { ext } from '../../extensionVariables';
import * as acrTools from '../../utils/Azure/acrTools';
import { getResourceGroupName, streamLogs } from "../../utils/Azure/acrTools";
import { AzureUtilityManager } from "../../utils/azureUtilityManager";
import { resolveFileItem } from '../build-image';
import { getTempSourceArchivePath, uploadSourceCode } from '../utils/OutputChannel';
import { quickPickACRRegistry, quickPickSubscription, quickPickTask } from '../utils/quick-pick-azure';

const status = vscode.window.createOutputChannel('Run ACR Task status');

export async function runTask(context?: TaskNode): Promise<any> {
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
        type: 'TaskRunRequest',
        taskName: taskName
    };

    try {
        let taskRun = await client.registries.scheduleRun(resourceGroup.name, registry.name, runRequest);
        vscode.window.showInformationMessage(`Successfully ran the Task: ${taskName} with ID: ${taskRun.runId}`);
    } catch (err) {
        ext.outputChannel.append(err);
        vscode.window.showErrorMessage(`Failed to ran the Task: ${taskName}`);
    }
}

// Runs the selected yaml file. Equivalent to az acr run -f <yaml file> <directory>
// Selected source code must contain a path to the desired dockerfile.
export async function runTaskFile(yamlFileUri?: vscode.Uri): Promise<void> {
    //Acquire information from user
    const subscription = await quickPickSubscription();

    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    const registry: Registry = await quickPickACRRegistry(true);

    const resourceGroupName = getResourceGroupName(registry);

    const osPick = ['Linux', 'Windows'].map(item => <IAzureQuickPickItem<string>>{ label: item, data: item });
    const osType: string = (await ext.ui.showQuickPick(osPick, { 'canPickMany': false, 'placeHolder': 'Select image base OS' })).data;

    //Begin readying build
    status.show();

    let folder: vscode.WorkspaceFolder;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
        folder = vscode.workspace.workspaceFolders[0];
    } else {
        folder = await (<any>vscode).window.showWorkspaceFolderPick();
    }
    const yamlItem = await resolveFileItem(folder, yamlFileUri, "Yaml");
    const sourceLocation: string = folder.uri.path;
    const tarFilePath = getTempSourceArchivePath(status);

    const uploadedSourceLocation = await uploadSourceCode(status, client, registry.name, resourceGroupName, sourceLocation, tarFilePath, folder);
    status.appendLine("Uploaded Source Code to " + tarFilePath);

    const runRequest: FileTaskRunRequest = {
        type: 'FileTaskRunRequest',
        taskFilePath: yamlItem.relativeFilePath,
        //valuesFilePath: yamlItem.relativeFolderPath,
        sourceLocation: uploadedSourceLocation,
        platform: { os: osType }
    };

    const run = await client.registries.scheduleRun(resourceGroupName, registry.name, runRequest);
    status.appendLine("Schedule Run " + run.runId);

    streamLogs(registry, run, status, client);
}
