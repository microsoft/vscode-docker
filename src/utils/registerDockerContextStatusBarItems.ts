/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from "../extensionVariables";
import { ListContextItem } from '../runtimes/docker/contracts/ContainerClient';

const dockerContextStatusBarSetting = 'contexts.showInStatusBar';

export function registerDockerContextStatusBarEvent(ctx: vscode.ExtensionContext): void {
    // Register an event to watch for changes to config, reconfigure if needed
    registerEvent('docker.command.changed', vscode.workspace.onDidChangeConfiguration, (actionContext: IActionContext, e: vscode.ConfigurationChangeEvent) => {

        actionContext.telemetry.suppressAll = true;
        actionContext.errorHandling.suppressDisplay = true;

        if (e.affectsConfiguration('docker.contexts.showInStatusBar')) {
            // Don't wait
            void registerDockerContextStatusBarItems(ctx);
        }
    });
}

export async function registerDockerContextStatusBarItems({ subscriptions }: vscode.ExtensionContext): Promise<void> {

    const config = vscode.workspace.getConfiguration('docker');
    let currentDockerContext: ListContextItem | undefined;

    // if dockerContextStatusBarItem is created, then we dispose
    if (!config.get(dockerContextStatusBarSetting, false) ||
        !(currentDockerContext = await ext.runtimeManager.contextManager.getCurrentContext())) { // Intentional assignment and boolean check
        ext.dockerContextStatusBarItem?.dispose();
        return;
    }

    const dockerContextUseCommand = 'vscode-docker.contexts.use';

    // Register the status bar item for the current context
    ext.dockerContextStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
    ext.dockerContextStatusBarItem.command = dockerContextUseCommand;
    ext.dockerContextStatusBarItem.name = vscode.l10n.t('Docker Contexts');

    async function updateStatusBar() {
        currentDockerContext = await ext.runtimeManager.contextManager.getCurrentContext();
        const currentContextName = `Context: ${currentDockerContext.name}`;
        ext.dockerContextStatusBarItem.text = currentContextName;
        ext.dockerContextStatusBarItem.tooltip = vscode.l10n.t('Change Docker Context');
        ext.dockerContextStatusBarItem.show();
    }

    subscriptions.push(
        ext.dockerContextStatusBarItem,
        vscode.workspace.onDidChangeConfiguration(updateStatusBar),
        ext.runtimeManager.contextManager.onContextChanged(updateStatusBar)
    );

    // Don't wait
    void updateStatusBar();
}
