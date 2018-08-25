/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as opn from 'opn';
import { AzureSession } from '../../typings/azure-account.api';
import { AzureImageTagNode, AzureRegistryNode, AzureRepositoryNode } from '../models/azureRegistryNodes';

export function browseAzurePortal(node?: AzureRegistryNode | AzureRepositoryNode | AzureImageTagNode): void {

    if (node) {
        const tenantId: string = node.subscription.tenantId;
        const session: AzureSession = node.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        let url: string = `${session.environment.portalUrl}/${tenantId}/#resource${node.registry.id}`;
        if (node.contextValue === AzureImageTagNode.contextValue || node.contextValue === AzureRepositoryNode.contextValue) {
            url = `${url}/repository`;
        }
        opn(url);
    }

}
