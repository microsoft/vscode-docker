/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from 'vscode';
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { dockerContextManager, IDockerContextListItem } from '../../utils/dockerContextManager';

export async function selectDockerContext(prompt: string): Promise<IDockerContextListItem> {
    const fetchingContexts = localize('vscode-docker.commands.context.fetchingContexts', 'Fetching Docker contexts...');
    const contexts: IDockerContextListItem[] = await window.withProgress(
        { location: ProgressLocation.Notification, title: fetchingContexts },
        async () => { return await dockerContextManager.listAll(); });

    const contextItems: IAzureQuickPickItem<IDockerContextListItem>[] = contexts.map(ctx => ({
        label: ctx.Name,
        description: ctx.Current ? localize('vscode-docker.commands.context.currentLabel', '(current)') : '',
        data: ctx
    }));

    const selectedContextItem = await ext.ui.showQuickPick(contextItems, {
        placeHolder: prompt,
        suppressPersistence: true
    });

    return selectedContextItem.data;
}
