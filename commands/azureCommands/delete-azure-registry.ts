import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { quickPickACRRegistry } from '../../commands/utils/quick-pick-azure';
import { AzureRegistryNode } from '../../explorer/models/azureRegistryNodes';
import { SubscriptionModels } from "../../node_modules/azure-arm-resource";
import { reporter } from '../../telemetry/telemetry';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureUtilityManager } from '../../utils/AzureUtilityManager';

const teleCmdId: string = 'vscode-docker.deleteAzureRegistry';

/** Delete a registry and all it's associated nested items
 * @param context : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteAzureRegistry(context?: AzureRegistryNode): Promise<void> {
    let registry: Registry;
    if (context) {
        registry = context.registry;
    } else {
        registry = await quickPickACRRegistry();
    }

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this registry and its associated images? Enter yes to continue: '
    };
    let answer = await vscode.window.showInputBox(opt);

    answer = answer.toLowerCase();
    if (answer !== 'yes') { return; }

    let subscription: SubscriptionModels.Subscription = acrTools.getRegistrySubscription(registry);
    let resourceGroup: string = acrTools.getResourceGroupName(registry);
    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(subscription);

    await client.registries.beginDeleteMethod(resourceGroup, registry.name);
    vscode.window.showInformationMessage('Successfully deleted registry ' + registry.name);
    telemetryReport();
}

function telemetryReport(): void {
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
