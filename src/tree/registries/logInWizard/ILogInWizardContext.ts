/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ICachedRegistryProvider } from '../IRegistryProvider';
import { ILogInWizardOptions } from './ILogInWizardOptions';

export interface ILogInWizardContext extends IActionContext, ILogInWizardOptions {
    existingProviders: ICachedRegistryProvider[];

    username?: string;
    password?: string;
    url?: string;
}
