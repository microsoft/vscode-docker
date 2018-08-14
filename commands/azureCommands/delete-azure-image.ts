import { Registry } from "azure-arm-containerregistry/lib/models";
import { SubscriptionModels } from 'azure-arm-resource';
import * as vscode from "vscode";
import * as quickPicks from '../../commands/utils/quick-pick-azure';
import { UserCancelledError } from "../../explorer/deploy/wizard";
import { AzureImageNode } from '../../explorer/models/AzureRegistryNodes';
import { reporter } from '../../telemetry/telemetry';
import * as acrTools from '../../utils/Azure/acrTools';
import { Repository } from "../../utils/Azure/models/repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';

const teleCmdId: string = 'vscode-docker.deleteACRImage';

/** Function to delete an Azure repository and its associated images
 * @param context : if called through right click on AzureRepositoryNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageNode): Promise<void> {
    if (!AzureUtilityManager.getInstance().waitForLogin()) {
        vscode.window.showErrorMessage('You are not logged into Azure');
        throw new Error('User is not logged into azure');
    }
    let registry: Registry;
    let subscription: SubscriptionModels.Subscription;
    let repoName: string;
    let tag: string;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        subscription = acrTools.getRegistrySubscription(registry);
        const repository: Repository = await quickPicks.quickPickACRRepository(registry);
        repoName = repository.name;
        const image = await quickPicks.quickPickACRImage(repository);
        tag = image.tag;
    } else {
        repoName = context.label;
        subscription = context.subscription;
        registry = context.registry;
        let wholeName = repoName.split(':');
        repoName = wholeName[0];
        tag = wholeName[1];
    }

    const shouldDelete = await quickPicks.confirmUserIntent('Are you sure you want to delete this image? Enter Yes to continue: ');
    if (shouldDelete) {
        let creds = await acrTools.loginCredentials(registry);
        let path = `/v2/_acr/${repoName}/tags/${tag}`;
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, creds.username, creds.password);
        vscode.window.showInformationMessage(`Successfully deleted image ${tag}`);
    } else {
        throw new UserCancelledError();
    }
    reportTelemetry();
}

function reportTelemetry(): void {
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
