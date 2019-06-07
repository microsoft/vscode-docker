/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';

export interface IPrivateRegistryWizardContext extends IActionContext {
    existingUrls: string[];
    newRegistryUrl?: string;
    newRegistryPassword?: string;
    newRegistryUsername?: string;
}
