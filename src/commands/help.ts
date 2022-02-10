/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickOptions } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { extensionId } from '../constants';
import { localize } from '../localize';

interface HelpMenuItem extends vscode.QuickPickItem {
    handler(): Promise<void>,
    telemetryID: string
}

export async function help(context: IActionContext): Promise<void> {
    const items: HelpMenuItem[] = [
        { label: localize('vscode-docker.commands.help.getStarted', 'Get started with Docker...'), handler: getStarted, telemetryID: 'getStarted' },
        { label: localize('vscode-docker.commands.help.review', 'Review Docker extension issues...'), handler: reviewIssues, telemetryID: 'reviewIssues' },
        { label: localize('vscode-docker.commands.help.report', 'Report Docker extension issue...'), handler: reportIssue, telemetryID: 'reportIssue' },
        { label: localize('vscode-docker.commands.help.editSettings', 'Edit settings...'), handler: editSettings, telemetryID: 'editSettings' }
    ];

    const options: IAzureQuickPickOptions = { canPickMany: false, suppressPersistence: true };
    const selectedItem: HelpMenuItem = await context.ui.showQuickPick(items, options);
    context.telemetry.properties.helpItem = selectedItem.telemetryID;
    await selectedItem.handler();
}

async function getStarted(): Promise<void> {
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.openExternal(vscode.Uri.parse('https://code.visualstudio.com/docs/containers/overview'));
}

async function reviewIssues(): Promise<void> {
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode-docker/issues'));
}

async function reportIssue(): Promise<void> {
    return vscode.commands.executeCommand('vscode.openIssueReporter', `${extensionId}`);
}

async function editSettings(): Promise<void> {
    return vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${extensionId}`);
}
