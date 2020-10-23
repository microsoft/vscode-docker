/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as semver from 'semver';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { extensionVersion } from '../../constants';
import { ext } from '../../extensionVariables';
import { startPage } from './StartPage';

const lastVersionKey = 'vscode-docker.startPage.lastVersionShown';

export async function openStartPage(context: IActionContext, reason: 'install' | 'command' = 'command'): Promise<void> {
    context.telemetry.properties.reason = reason;
    await startPage.createOrShow(context);
}

export async function openStartPageIfNecessary(): Promise<void> {
    if (!vscode.workspace.getConfiguration('docker').get('showStartPage', false)) {
        // Don't show: disabled by settings
        return;
    } else if (!/^en(-us)?$/i.test(vscode.env.language)) {
        // Don't show: this page is English only
        return;
    } else if (!(await ext.experimentationService.isFlightEnabled('vscode-docker.openStartPage'))) {
        // Don't show: flight not enabled
        return;
    }

    const lastVersion = new semver.SemVer(ext.context.globalState.get(lastVersionKey, '0.0.1'));
    const thisVersion = new semver.SemVer(extensionVersion.value);
    const diff = semver.diff(thisVersion, lastVersion);

    if (semver.lte(thisVersion, lastVersion) || diff === 'prepatch' || diff === 'patch' || diff === 'prerelease') {
        // Don't show: already showed during this major/minor
        return;
    }

    // Show!
    await ext.context.globalState.update(lastVersionKey, extensionVersion.value);
    void vscode.commands.executeCommand('vscode-docker.help.openStartPage', 'install');
}
