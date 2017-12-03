import * as opn from 'opn';
import { AzureRepositoryNode, AzureImageNode, AzureRegistryNode } from './azureRegistryNodes';
import { AzureSession } from '../../typings/azure-account.api';

// export function browseAzurePortal(context?: DockerHubImageNode | DockerHubRepositoryNode | DockerHubOrgNode) {

//     if (context) {
//         let url: string = 'https://hub.docker.com/';
//         const repo: RepositoryInfo = context.repository;
//         switch (context.contextValue) {
//             case 'dockerHubNamespace':
//                 url = `${url}u/${context.userName}`;
//                 break;
//             case 'dockerHubRepository':
//                 url = `${url}r/${context.repository.namespace}/${context.repository.name}`;
//                 break;
//             case 'dockerHubImageTag':
//                 url = `${url}r/${context.repository.namespace}/${context.repository.name}/tags`;
//                 break;
//         }
//         opn(url);
//     }
// }

export function browseAzurePortal(context?: AzureRegistryNode /* | AzureRepositoryNode | AzureImageNode */): void {

    if (context) {
        const tenantId: string = context.subscription.tenantId;
        const session: AzureSession = context.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const url: string = `${session.environment.portalUrl}/${tenantId}/#resource${context.registry.id}`;
        opn(url);
    }

}
