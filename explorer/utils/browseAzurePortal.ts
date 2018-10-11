/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as opn from 'opn';
import { AzureSession } from '../../typings/azure-account.api';
import { getTenantId, nonNullValue } from '../../utils/nonNull';
import { AzureImageTagNode, AzureRegistryNode, AzureRepositoryNode } from '../models/azureRegistryNodes';

export function browseAzurePortal(node?: AzureRegistryNode | AzureRepositoryNode | AzureImageTagNode): void {

    if (node && node.azureAccount) {
        const tenantId: string = getTenantId(node.subscription);
        const session: AzureSession = nonNullValue(
            node.azureAccount.sessions.find(s => s.tenantId.toLowerCase() === tenantId.toLowerCase()),
            `Unable to find session with tenantId ${tenantId}`);
        let url: string = `${session.environment.portalUrl}/${tenantId}/#resource${node.registry.id}`;
        if (node.contextValue === AzureImageTagNode.contextValue || node.contextValue === AzureRepositoryNode.contextValue) {
            url = `${url}/repository`;
        }
        // tslint:disable-next-line:no-unsafe-any
        opn(url);
    }

}
