/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { AzExtLocation } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardExecuteStep, nonNullProp, parseError } from '@microsoft/vscode-azext-utils';
import { l10n, Progress } from 'vscode';
import { ext } from '../../../../extensionVariables';
import { getArmContainerRegistry, getAzExtAzureUtils } from '../../../../utils/lazyPackages';
import { IAzureRegistryWizardContext } from './IAzureRegistryWizardContext';

export class AzureRegistryCreateStep extends AzureWizardExecuteStep<IAzureRegistryWizardContext> {
    public priority: number = 130;

    public async execute(context: IAzureRegistryWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const newRegistryName = nonNullProp(context, 'newRegistryName');

        const azExtAzureUtils = await getAzExtAzureUtils();
        const armContainerRegistry = await getArmContainerRegistry();
        const client = azExtAzureUtils.createAzureClient(context, armContainerRegistry.ContainerRegistryManagementClient);
        const creating: string = l10n.t('Creating registry "{0}"...', newRegistryName);
        ext.outputChannel.info(creating);
        progress.report({ message: creating });

        const location: AzExtLocation = await azExtAzureUtils.LocationListStep.getLocation(context);
        const locationName: string = nonNullProp(location, 'name');
        const resourceGroup = nonNullProp(context, 'resourceGroup');
        try {
            context.registry = await client.registries.beginCreateAndWait(
                nonNullProp(resourceGroup, 'name'),
                newRegistryName,
                {
                    sku: {
                        name: nonNullProp(context, 'newRegistrySku')
                    },
                    location: locationName
                }
            );
        }
        catch (err) {
            const parsedError = parseError(err);
            if (parsedError.errorType === 'MissingSubscriptionRegistration') {
                context.errorHandling.suppressReportIssue = true;
            }

            throw err;
        }

        const created = l10n.t('Successfully created registry "{0}".', newRegistryName);
        ext.outputChannel.info(created);
    }

    public shouldExecute(context: IAzureRegistryWizardContext): boolean {
        return !context.registry;
    }
}
