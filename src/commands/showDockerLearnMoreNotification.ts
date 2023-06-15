/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { isMac, isWindows } from '../utils/osUtils';

export async function showDockerLearnMoreNotification(): Promise<void> {
    const learnMoreMessage = vscode.l10n.t('Docker is not installed. Would you like to learn more about installing Docker?');
    const confirmationPrompt = vscode.l10n.t('Learn more');

    const response = await vscode.window.showInformationMessage(learnMoreMessage, ...[confirmationPrompt]);
    if (response) {
        await openDockerDownloadPage();
    }
}

export async function openDockerDownloadPage(): Promise<void> {
    if (isWindows()) {
        await vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/vscode/docker-windows-download'));
    } else if (isMac()) {
        await vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/vscode/docker-mac-download'));
    } else {
        await vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/download-docker-linux-vscode'));
    }
}

