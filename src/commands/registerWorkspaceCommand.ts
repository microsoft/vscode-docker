/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { ConfigurationTarget, MessageItem, WorkspaceConfiguration, commands, workspace } from 'vscode';
import { extensionId } from '../constants';
import { localize } from '../localize';
import { DockerExtensionKind, IVSCodeRemoteInfo, RemoteKind, getVSCodeRemoteInfo } from '../utils/getVSCodeRemoteInfo';
import { registerCommand } from './registerCommands';

/**
 * Registers a command that requires running in the "workspace" environment (as opposed to a "ui" extension).
 * The most common reason this is required is when using the file system and/or a terminal.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function registerWorkspaceCommand(commandId: string, callback: (context: IActionContext, ...args: any[]) => any, debounce?: number): void {
    registerCommand(
        commandId,
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        async (context, ...args: any[]) => {
            await verifyIsRunningInWorkspace(context);
            return callback(context, ...args);
        },
        debounce
    );
}

async function verifyIsRunningInWorkspace(context: IActionContext): Promise<void> {
    const config: WorkspaceConfiguration = workspace.getConfiguration('docker');
    if (!!config.get('showRemoteWorkspaceWarning')) {
        const remoteInfo: IVSCodeRemoteInfo = getVSCodeRemoteInfo(context);
        if (remoteInfo.extensionKind === DockerExtensionKind.ui) {
            let message: string;
            let switchTitle: string;
            let learnMoreLink: string;
            switch (remoteInfo.remoteKind) {
                case RemoteKind.ssh:
                    message = localize('vscode-docker.commands.registerWorkspaceCommands.local', 'This operation is not supported because the Docker extension is currently running on your local machine.');
                    switchTitle = localize('vscode-docker.commands.registerWorkspaceCommands.switchSsh', 'Switch to Remote SSH');
                    learnMoreLink = 'https://aka.ms/AA5y2rd';
                    break;
                case RemoteKind.wsl:
                    message = localize('vscode-docker.commands.registerWorkspaceCommands.outsideWsl', 'This operation is not supported because the Docker extension is currently running outside of WSL.');
                    switchTitle = localize('vscode-docker.commands.registerWorkspaceCommands.switchWsl', 'Switch to WSL');
                    learnMoreLink = 'https://aka.ms/AA5xvjn';
                    break;
                case RemoteKind.devContainer:
                    message = localize('vscode-docker.commands.registerWorkspaceCommands.outsideContainer', 'This operation is not supported because the Docker extension is currently running outside of your container.');
                    switchTitle = localize('vscode-docker.commands.registerWorkspaceCommands.switchContainer', 'Switch to Container');
                    learnMoreLink = 'https://aka.ms/AA5xva6';
                    break;
                default:
                    // Assume this works rather than block users on unknown remotes
                    return;
            }

            const switchBtn: MessageItem = { title: switchTitle };
            await context.ui.showWarningMessage(message, { learnMoreLink, stepName: 'switchExtensionKind' }, switchBtn);
            updateExtensionKind('workspace');

            const reloadMessage: string = localize('vscode-docker.commands.registerWorkspaceCommands.reloadRequired', 'This change to the Docker extension requires reloading VS Code to take effect.');
            const reload: MessageItem = { title: localize('vscode-docker.commands.registerWorkspaceCommands.reload', 'Reload Now') };
            await context.ui.showWarningMessage(reloadMessage, { stepName: 'requiresReload' }, reload);

            // Add a one-off event here before reloading the window otherwise we'll lose telemetry for this code path
            await callWithTelemetryAndErrorHandling('verifyIsWorkspaceExtension', (newContext: IActionContext) => {
                Object.assign(newContext, context);
            });

            await commands.executeCommand('workbench.action.reloadWindow');

            // throw an exception just to make sure we don't try to continue the command before the window is fully reloaded
            throw new UserCancelledError('reloading');
        }
    }
}

function updateExtensionKind(newKind: string): void {
    const settingKey: string = 'remote.extensionKind';
    const config: WorkspaceConfiguration = workspace.getConfiguration();
    const values = config.inspect(settingKey);
    let target: ConfigurationTarget;
    let value: unknown;

    // If the setting is already defined as a workspace setting - overwrite that
    if (typeof values.workspaceValue === 'object' && values.workspaceValue !== null && values.workspaceValue[extensionId]) {
        target = ConfigurationTarget.Workspace;
        value = values.workspaceValue;
    } else { // otherwise update the global setting
        target = ConfigurationTarget.Global;
        if (typeof values.globalValue === 'object' && values.globalValue !== null) {
            value = values.globalValue;
        } else {
            value = {};
        }
    }

    value[extensionId] = newKind;
    // TODO: Should this be awaited?
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    config.update(settingKey, value, target);
}
