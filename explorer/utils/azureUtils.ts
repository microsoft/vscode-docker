/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as opn from 'opn';
import { AzureSession } from '../../typings/azure-account.api';
import { AzureImageTagNode, AzureRegistryNode, AzureRepositoryNode } from '../models/azureRegistryNodes';

export function browseAzurePortal(context?: AzureRegistryNode | AzureRepositoryNode | AzureImageTagNode): void {

    if (context) {
        const tenantId: string = context.subscription.tenantId;
        const session: AzureSession = context.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        let url: string = `${session.environment.portalUrl}/${tenantId}/#resource${context.registry.id}`;
        if (context.contextValue === AzureImageTagNode.contextValue || context.contextValue === AzureRepositoryNode.contextValue) {
            url = `${url}/repository`;
        }
        opn(url);
    }

}
