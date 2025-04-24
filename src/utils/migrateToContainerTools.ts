/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';

const dontShowAgainKey = 'vscode-docker.migrateToContainerTools.dontShowAgain';

const reminderIntervalMs = 60 * 60 * 60 * 1000; // 60 hours (2.5 days) in milliseconds
const lastShownKey = 'vscode-docker.migrateToContainerTools.lastShown';

export async function migrateToContainerTools(): Promise<void> {
    const shouldInstall = await callWithTelemetryAndErrorHandling<boolean>('vscode-docker.migrateToContainerTools', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';

        // Check if the user has already opted out of the notification
        const dontShowAgain = ext.context.globalState.get<boolean>(dontShowAgainKey, false);

        if (dontShowAgain) {
            context.telemetry.suppressAll = true;
            return false;
        }

        // Check if the user has already seen the notification within the reminder interval
        const lastShown = ext.context.globalState.get<number>(lastShownKey, 0);
        const now = Date.now();
        if (lastShown && now - lastShown < reminderIntervalMs) {
            context.telemetry.suppressAll = true;
            return false;
        }

        // Update the last shown time to now
        await ext.context.globalState.update(lastShownKey, now);

        const message = vscode.l10n.t('The Docker extension is becoming the Container Tools extension, which you can install and try now. Installing the Container Tools extension will uninstall the Docker extension and the window will be reloaded. Make sure to save your changes before proceeding. [Learn More](https://aka.ms/vscode-container-tools-learn-more)');

        const tryNowButton = vscode.l10n.t('Install and Reload');
        const remindMeButton = vscode.l10n.t('Remind Me');
        const dontShowAgainButton = vscode.l10n.t('Don\'t Show Again');

        // Show the notification
        const result = await vscode.window.showInformationMessage(message, tryNowButton, remindMeButton, dontShowAgainButton);

        if (result === tryNowButton) {
            context.telemetry.properties.choice = 'install';
            return true;
        } else if (result === remindMeButton) {
            context.telemetry.properties.choice = 'remindMe';
            return false;
        } else if (result === dontShowAgainButton) {
            context.telemetry.properties.choice = 'dontShowAgain';
            await ext.context.globalState.update(dontShowAgainKey, true);
            return false;
        } else {
            // User closed the notification
            context.telemetry.properties.choice = 'closed';
            return false;
        }
    });

    if (shouldInstall) {
        // Install the Container Tools extension
        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-azuretools.vscode-containers');

        // Uninstall the Docker extension
        await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', 'ms-azuretools.vscode-docker');

        // Reload the window to apply changes
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}
