/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Registry as AcrRegistry, SkuName as AcrSkuName } from '@azure/arm-containerregistry'; // These are only dev-time imports so don't need to be lazy
import type { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils'; // These are only dev-time imports so don't need to be lazy

export interface IAzureRegistryWizardContext extends IResourceGroupWizardContext {
    newRegistryName?: string;
    newRegistrySku?: AcrSkuName;
    registry?: AcrRegistry;
}
