import * as opn from 'opn';
import { AzureSession } from '../../typings/azure-account.api';
import { AzureImageNode, AzureRegistryNode, AzureRepositoryNode } from '../models/azureRegistryNodes';

export function browseAzurePortal(context?: AzureRegistryNode | AzureRepositoryNode | AzureImageNode): void {

    if (context) {
        const tenantId: string = context.subscription.tenantId;
        const session: AzureSession = context.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        let url: string = `${session.environment.portalUrl}/${tenantId}/#resource${context.registry.id}`;
        if (context.contextValue === 'azureImageNode' || context.contextValue === 'azureRepositoryNode') {
            url = `${url}/repository`;
        }
        opn(url);
    }

}
