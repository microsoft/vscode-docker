/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ICachedRegistryProvider } from "../ICachedRegistryProvider";
import { IConnectRegistryWizardOptions } from './IConnectRegistryWizardOptions';

export interface IConnectRegistryWizardContext extends IActionContext, IConnectRegistryWizardOptions {
    existingProviders: ICachedRegistryProvider[];

    username?: string;
    secret?: string;
    url?: string;
}
