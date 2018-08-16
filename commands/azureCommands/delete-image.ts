import { Registry } from "azure-arm-containerregistry/lib/models";
import * as vscode from "vscode";
import { dockerExplorerProvider } from '../../dockerExtension';
import { UserCancelledError } from "../../explorer/deploy/wizard";
import { AzureImageNode, AzureRepositoryNode } from '../../explorer/models/azureRegistryNodes';
import { reporter } from '../../telemetry/telemetry';
import * as acrTools from '../../utils/Azure/acrTools';
import { AzureImage } from "../../utils/Azure/models/image";
import { Repository } from "../../utils/Azure/models/repository";
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import * as quickPicks from '../utils/quick-pick-azure';

const teleCmdId: string = 'vscode-docker.delete-ACR-Image';

/** Function to delete an Azure hosted image
 * @param context : if called through right click on AzureImageNode, the node object will be passed in. See azureRegistryNodes.ts for more info
 */
export async function deleteAzureImage(context?: AzureImageNode): Promise<void> {
    if (!AzureUtilityManager.getInstance().waitForLogin()) {
        vscode.window.showErrorMessage('You are not logged into Azure');
        throw new Error('User is not logged into azure');
    }
    let registry: Registry;
    let repoName: string;
    let tag: string;

    if (!context) {
        registry = await quickPicks.quickPickACRRegistry();
        const repository: Repository = await quickPicks.quickPickACRRepository(registry, 'Choose the Repository of the image you want to delete');
        repoName = repository.name;
        const image: AzureImage = await quickPicks.quickPickACRImage(repository, 'Choose the Image you want to delete');
        tag = image.tag;
    } else {
        registry = context.registry;
        let wholeName: string[] = context.label.split(':');
        repoName = wholeName[0];
        tag = wholeName[1];
    }

    const shouldDelete = await quickPicks.confirmUserIntent(`Are you sure you want to delete ${repoName}:${tag}? Enter Yes to continue: `);
    if (shouldDelete) {
        const { acrAccessToken } = await acrTools.acquireACRAccessTokenFromRegistry(registry, `repository:${repoName}:*`);
        const path = `/v2/_acr/${repoName}/tags/${tag}`;
        await acrTools.sendRequestToRegistry('delete', registry.loginServer, path, acrAccessToken);
        vscode.window.showInformationMessage(`Successfully deleted image ${tag}`);
        if (context) {
            dockerExplorerProvider.refreshNode(context.parent);
        }
    } else {
        throw new UserCancelledError();
    }
    if (reporter) {
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}
