/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementModels as AcrModels } from '@azure/arm-containerregistry'; // These are only dev-time imports so don't need to be lazy
import { IResourceGroupWizardContext } from 'vscode-azureextensionui';

export interface IAzureRegistryWizardContext extends IResourceGroupWizardContext {
    newRegistryName?: string;
    newRegistrySku?: AcrModels.SkuName;
    registry?: AcrModels.Registry;
}
