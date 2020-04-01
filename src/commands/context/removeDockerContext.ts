/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { dockerContextManager } from '../../utils/dockerContextManager';
import { selectDockerContext } from './selectDockerContext';

export async function removeDockerContext(context: IActionContext): Promise<void> {
    const selectedContext = await selectDockerContext(localize('vscode-docker.commands.context.selectContextToRemove', 'Select Docker context to remove'));
    if (selectedContext.Current) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.commands.context.cannotRemoveContextInUse', 'Docker context currently in use cannot be removed'));
    }

    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(
        localize('vscode-docker.commands.context.confirmRemove', 'Are you sure you want to remove Docker context {0}?', selectedContext.Name),
        { modal: true },
        { title: localize('vscode-docker.commands.context.remove', 'Remove') });

    await dockerContextManager.remove(selectedContext.Name);
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.window.showInformationMessage(localize('vscode-docker.commands.context.contextRemoved', 'Docker context {0} has been removed', selectedContext.Name));
}
