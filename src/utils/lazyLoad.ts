/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { RemoteTagTreeItem } from '../tree/registries/RemoteTagTreeItem';
import { Lazy } from './lazy';

const deployImageToAzureLazy = new Lazy<Promise<(context: IActionContext, node?: RemoteTagTreeItem) => Promise<void>>>(async () => {
    const appService = (await import(/* webpackChunkName: "appService" */ 'vscode-azureappservice'));

    appService.registerAppServiceExtensionVariables(ext);

    return (await import(/* webpackChunkName: "deployImageToAzure" */ '../commands/registries/azure/deployImageToAzure')).deployImageToAzure;
});

// eslint-disable-next-line @typescript-eslint/tslint/config
export async function deployImageToAzure(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    const deployImageToAzureFunction = await deployImageToAzureLazy.value;
    return await deployImageToAzureFunction(context, node);
}
