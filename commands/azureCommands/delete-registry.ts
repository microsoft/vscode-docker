import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from "azure-arm-resource";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { UserCancelledError } from "../../explorer/deploy/wizard";
import { AzureRegistryNode } from '../../explorer/models/AzureRegistryNodes';
import { reporter } from '../../telemetry/telemetry';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { confirmUserIntent, quickPickACRRegistry } from '../utils/quick-pick-azure';

const teleCmdId: string = 'vscode-docker.delete-ACR-Registry';

/** Delete a registry and all it's associated nested items
 * @param context : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteAzureRegistry(context?: AzureRegistryNode): Promise<void> {
    let registry: Registry;
    if (context) {
        registry = context.registry;
    } else {
        registry = await quickPickACRRegistry(false, 'Choose the Registry you want to delete');
    }
    const shouldDelete = await confirmUserIntent('Are you sure you want to delete this registry and its associated images? Enter yes to continue: ');
    if (shouldDelete) {
        let subscription: SubscriptionModels.Subscription = acrTools.getSubscriptionFromRegistry(registry);
        let resourceGroup: string = acrTools.getResourceGroupName(registry);
        const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);
        await client.registries.beginDeleteMethod(resourceGroup, registry.name);
        vscode.window.showInformationMessage(`Successfully deleted registry ${registry.name}`);
        dockerExplorerProvider.refreshRegistries();
    } else {
        throw new UserCancelledError();
    }

    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
