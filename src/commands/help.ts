/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickOptions } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { extensionId } from '../constants';

interface HelpMenuItem extends vscode.QuickPickItem {
    handler(): Promise<void>,
    telemetryID: string
}

export async function help(context: IActionContext): Promise<void> {
    const items: HelpMenuItem[] = [
        { label: vscode.l10n.t('Get started with Docker...'), handler: getStarted, telemetryID: 'getStarted' },
        { label: vscode.l10n.t('Review Docker extension issues...'), handler: reviewIssues, telemetryID: 'reviewIssues' },
        { label: vscode.l10n.t('Report Docker extension issue...'), handler: reportIssueFromHelpMenu, telemetryID: 'reportIssue' },
        { label: vscode.l10n.t('Edit settings...'), handler: editSettings, telemetryID: 'editSettings' }
    ];

    const options: IAzureQuickPickOptions = { canPickMany: false, suppressPersistence: true };
    const selectedItem: HelpMenuItem = await context.ui.showQuickPick(items, options);
    context.telemetry.properties.helpItem = selectedItem.telemetryID;
    await selectedItem.handler();
}

export async function reportIssue(context: IActionContext): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openIssueReporter', {
        extensionId: extensionId,
        issueBody: undefined, // Leaving repro steps undefined forces the user to type in *something*, which is hopefully helpful
        data: await getIssueData(),
    });
}

async function getStarted(): Promise<void> {
    void vscode.env.openExternal(vscode.Uri.parse('https://code.visualstudio.com/docs/containers/overview'));
}

async function reviewIssues(): Promise<void> {
    void vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/vscode-docker/issues'));
}

async function reportIssueFromHelpMenu(): Promise<void> {
    return vscode.commands.executeCommand('vscode-docker.help.reportIssue');
}

async function editSettings(): Promise<void> {
    return vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${extensionId}`);
}

async function getIssueData(): Promise<string> {
    return `App Host: ${vscode.env.appHost}
Remote Name: ${vscode.env.remoteName}
Language: ${vscode.env.language}

`; // Add a couple newlines after the data because VSCode doesn't
}
