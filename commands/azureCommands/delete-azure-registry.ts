import * as vscode from "vscode";
const teleCmdId: string = 'vscode-docker.deleteAzureRegistry';
import { Registry } from "azure-arm-containerregistry/lib/models";
import * as quickPicks from '../../commands/utils/quick-pick-azure';
import { AzureRegistryNode } from '../../explorer/models/azureRegistryNodes';
import { SubscriptionModels } from "../../node_modules/azure-arm-resource";
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureCredentialsManager } from '../../utils/AzureCredentialsManager';

/**
 * delete a registry and all it's associated nested items
 * @param context : the AzureRegistryNode the user right clicked on to delete
 */
export async function deleteAzureRegistry(context?: AzureRegistryNode): Promise<void> {
    let registry: Registry;
    let subscription: SubscriptionModels.Subscription;
    let resourceGroup: string;
    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
    } else {
        const registries = await AzureCredentialsManager.getInstance().getRegistries();
        for (let instance of registries) {
            if (instance.name === context.registry.name) {
                registry = instance;
            }
        }
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

    subscription = acrTools.getRegistrySubscription(registry);
    resourceGroup = registry.id.slice(registry.id.search('resourceGroups/') + 'resourceGroups/'.length, registry.id.search('/providers/'));
    const client = AzureCredentialsManager.getInstance().getContainerRegistryManagementClient(subscription);
    client.registries.beginDeleteMethod(resourceGroup, registry.name).then((response) => {
        vscode.window.showInformationMessage('Successfully deleted registry ' + registry.name);
    }, (error) => {
        console.error("Failed!", error);
        vscode.window.showErrorMessage(error);
    })
    return;
}
