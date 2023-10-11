/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import { ListContextItem } from '@microsoft/vscode-container-client';
import * as vscode from 'vscode';
import { ext } from "../extensionVariables";

const dockerContextStatusBarSetting = 'contexts.showInStatusBar';

export function registerDockerContextStatusBarEvent(ctx: vscode.ExtensionContext): void {
    // Register an event to watch for changes to config, reconfigure if needed
    registerEvent('docker.context.showInStatusBar.changed', vscode.workspace.onDidChangeConfiguration, (actionContext: IActionContext, e: vscode.ConfigurationChangeEvent) => {

        actionContext.telemetry.suppressAll = true;
        actionContext.errorHandling.suppressDisplay = true;

        if (e.affectsConfiguration('docker.contexts.showInStatusBar')) {
            // Don't wait
            void scheduleUpdateStatusBar();
        }
    });

    ctx.subscriptions.push(
        ext.dockerContextStatusBarItem,
        ext.runtimeManager.contextManager.onContextChanged(scheduleUpdateStatusBar)
    );

    // Don't wait
    void scheduleUpdateStatusBar();
}

async function showStatusBarItemIfNeeded() {

    const config = vscode.workspace.getConfiguration('docker');
    let currentDockerContext: ListContextItem | undefined;
    // if dockerContextStatusBarItem is created, then we dispose
    ext.dockerContextStatusBarItem?.dispose();

    if (!config.get(dockerContextStatusBarSetting, false) ||
        !(currentDockerContext = await ext.runtimeManager.contextManager.getCurrentContext())) { // Intentional assignment and boolean check
        return;
    }

    const dockerContextUseCommand = 'vscode-docker.contexts.use';

    ext.dockerContextStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
    ext.dockerContextStatusBarItem.command = dockerContextUseCommand;
    ext.dockerContextStatusBarItem.name = vscode.l10n.t('Docker Contexts');
    ext.dockerContextStatusBarItem.text = currentDockerContext.name;
    ext.dockerContextStatusBarItem.tooltip = vscode.l10n.t('Change Docker Context');
    ext.dockerContextStatusBarItem.show();
}

let updatePromise: Promise<void> | undefined;
function scheduleUpdateStatusBar(): Promise<void> {
    if (!updatePromise) {
        updatePromise = showStatusBarItemIfNeeded().finally(() => updatePromise = undefined);
    }
    return updatePromise;
}
