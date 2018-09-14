import { Build, Registry } from "azure-arm-containerregistry/lib/models";
import { Subscription } from "azure-arm-resource/lib/subscription/models";
import * as vscode from "vscode";
import { AzureImageTagNode, AzureRegistryNode, AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import { BuildTaskNode } from "../../explorer/models/taskNode";
import { getResourceGroupName, getSubscriptionFromRegistry } from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { quickPickACRRegistry } from '../utils/quick-pick-azure'
import { accessLog } from "./acr-build-logs-utils/logFileManager";
import { LogData } from "./acr-build-logs-utils/tableDataManager";
import { LogTableWebview } from "./acr-build-logs-utils/tableViewManager";

/**  This command is used through a right click on an azure registry, repository or image in the Docker Explorer. It is used to view build logs for a given item. */
export async function viewBuildLogs(context: AzureRegistryNode | AzureImageTagNode | BuildTaskNode): Promise<void> {
    let registry: Registry;
    let subscription: Subscription;
    if (!context) {
        registry = await quickPickACRRegistry();
        if (!registry) { return; }
        subscription = getSubscriptionFromRegistry(registry);
    } else {
        registry = context.registry;
        subscription = context.subscription;
    }
    let resourceGroup: string = getResourceGroupName(registry);
    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
    let logData: LogData = new LogData(client, registry, resourceGroup);

    // Fuiltering provided
    if (context && context instanceof AzureImageTagNode) {
        await logData.loadLogs(false, false, { image: context.tag });
        if (!hasValidLogContent(context, logData)) { return; }
        logData.getLink(0).then((url) => {
            accessLog(url, logData.logs[0].buildId, false);
        });
    } else {
        if (context && context instanceof BuildTaskNode) {
            await logData.loadLogs(false, false, { buildTask: context.label });
        } else {
            await logData.loadLogs(false);
        }
        if (!hasValidLogContent(context, logData)) { return; }
        let webViewTitle: string = registry.name;
        if (context instanceof BuildTaskNode) {
            webViewTitle += '/' + context.label;
        }
        let webview = new LogTableWebview(webViewTitle, logData);
    }
}

function hasValidLogContent(context: any, logData: LogData): boolean {
    if (logData.logs.length === 0) {
        let itemType: string;
        if (context && context instanceof BuildTaskNode) {
            itemType = 'task';
        } else if (context && context instanceof AzureImageTagNode) {
            itemType = 'image';
        } else {
            itemType = 'registry';
        }
        vscode.window.showInformationMessage(`This ${itemType} has no associated build logs`);
        return false;
    }
    return true;
}
