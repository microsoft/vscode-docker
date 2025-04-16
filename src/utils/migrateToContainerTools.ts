/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';

const dontShowAgainKey = 'vscode-docker.migrateToContainerTools.dontShowAgain';

export async function migrateToContainerTools(): Promise<void> {
    const shouldInstall = await callWithTelemetryAndErrorHandling<boolean>('vscode-docker.migrateToContainerTools', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';

        // Check if the user has already opted out of the notification
        const dontShowAgain = ext.context.globalState.get<boolean>(dontShowAgainKey, false);

        if (dontShowAgain) {
            context.telemetry.suppressAll = true;
            return false;
        }

        const message = vscode.l10n.t('The Docker extension is becoming the Container Tools extension. You can try Container Tools now. If you install it now, the Docker extension will be uninstalled, and the window reloaded. Make sure to save your changes before proceeding. [Learn More](https://aka.ms/vscode-container-tools-learn-more)');

        const tryNowButton = vscode.l10n.t('Install and Reload Now');
        const dontShowAgainButton = vscode.l10n.t('Don\'t Show Again');

        const result = await vscode.window.showInformationMessage(message, tryNowButton, dontShowAgainButton);

        if (result === tryNowButton) {
            // User opted in to install the Container Tools extension
            context.telemetry.properties.choice = 'install';
            return true;
        } else if (result === dontShowAgainButton) {
            // User opted out of the notification
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
        await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-azuretools.vscode-azureresourcegroups'); // TODO: Update to the correct extension ID for Container Tools

        // Uninstall the Docker extension
        await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', 'ms-azuretools.vscode-docker');

        // Reload the window to apply changes
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
    }
}
