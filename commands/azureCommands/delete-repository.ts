import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import * as vscode from "vscode";
import * as quickPicks from '../../commands/utils/quick-pick-azure';
import { AzureRepositoryNode } from '../../explorer/models/AzureRegistryNodes';
import { reporter } from '../../telemetry/telemetry';
import * as acrTools from '../../utils/Azure/acrTools';
import { Repository } from "../../utils/Azure/models/repository";

const teleCmdId: string = 'vscode-docker.deleteACRRepository';
/**
 * function to delete an Azure repository and its associated images
 * @param context : if called through right click on AzureRepositoryNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteRepository(context?: AzureRepositoryNode): Promise<void> {

    let registry: Registry;
    let subscription: SubscriptionModels.Subscription;
    let repoName: string;

    if (context) {
        repoName = context.label;
        subscription = context.subscription;
        registry = context.registry;
    } else {
        registry = await quickPicks.quickPickACRRegistry();
        subscription = acrTools.getRegistrySubscription(registry);
        const repository: Repository = await quickPicks.quickPickACRRepository(registry);
        repoName = repository.name;
    }

    // Ensure user truly wants to delete registry
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: 'No',
        value: 'No',
        prompt: 'Are you sure you want to delete this repository and its associated images? Enter Yes to continue: '
    };

    let answer = await vscode.window.showInputBox(opt);
    answer = answer.toLowerCase();
    if (answer !== 'yes') { return; }

    let creds = await acrTools.loginCredentials(subscription, registry);
    const username: string = creds.username;
    const password: string = creds.password;
    let path = `/v2/_acr/${repoName}/repository`;
    await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, username, password);
    reportTelemetry();
}

function reportTelemetry(): void {
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
