/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';

export interface IAciWizardContext extends IResourceGroupWizardContext {
    contextName: string;
}
