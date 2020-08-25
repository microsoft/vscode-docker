/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementModels as AcrModels } from '@azure/arm-containerregistry';
import { IResourceGroupWizardContext } from 'vscode-azureextensionui';

export interface IAzureRegistryWizardContext extends IResourceGroupWizardContext {
    newRegistryName?: string;
    newRegistrySku?: AcrModels.SkuName;
    registry?: AcrModels.Registry;
}
