/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickOptions } from 'vscode-azureextensionui';

import { ext } from '../extensionVariables';
import { openExternal } from '../utils/openExternal';
import { getDockerExtensionPackageJson } from '../utils/extension';

interface HelpMenuItem extends vscode.QuickPickItem {
    handler: () => Promise<void>
}

export async function showHelpMenu(context: IActionContext): Promise<void> {
    let items: HelpMenuItem[] = [
        { label: 'Get started with Docker...', handler: getStarted },
        { label: 'Review Docker extension issues...', handler: reviewIssues },
        { label: 'Report Docker extension issue...', handler: reportIssue },
        { label: 'Edit settings...', handler: editSettings }
    ];

    const options: IAzureQuickPickOptions = { canPickMany: false, suppressPersistence: true }
    let selectedItem: HelpMenuItem = await ext.ui.showQuickPick(items, options);
    context.telemetry.properties.helpItem = selectedItem.handler.name;
    await selectedItem.handler();
}

async function getStarted(): Promise<void> {
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    openExternal("https://code.visualstudio.com/docs/containers/overview");
}

async function reviewIssues(): Promise<void> {
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    openExternal("https://github.com/microsoft/vscode-docker/issues");
}

async function reportIssue(): Promise<void> {
    const packageJson = getDockerExtensionPackageJson();
    return vscode.commands.executeCommand('vscode.openIssueReporter', `${packageJson.publisher}.${packageJson.name}`);
}

async function editSettings(): Promise<void> {
    const packageJson = getDockerExtensionPackageJson();
    return vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${packageJson.publisher}.${packageJson.name}`);
}
