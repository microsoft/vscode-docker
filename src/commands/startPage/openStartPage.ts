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

export async function openStartPage(context: IActionContext): Promise<void> {
    await startPage.createOrShow(context);
}

export async function openStartPageAfterExtensionUpdate(): Promise<void> {
    if (!vscode.workspace.getConfiguration('docker').get('showStartPage', false)) {
        // Don't show: disabled by settings
        return;
    } else if (!/^en(-us)?$/i.test(vscode.env.language)) {
        // Don't show: this page is English only
        return;
    } else if (!isHigherMinorVersion(extensionVersion.value, ext.context.globalState.get(lastVersionKey, '0.0.1'))) {
        // Don't show: already showed during this major/minor
        return;
    }

    // Let's show!
    await ext.context.globalState.update(lastVersionKey, extensionVersion.value);
    void vscode.commands.executeCommand('vscode-docker.help.openStartPage', { commandReason: 'install' });
}

// Exported just for unit tests
export function isHigherMinorVersion(a: string | semver.SemVer, b: string | semver.SemVer): boolean {
    if (typeof (a) === 'string') {
        a = semver.coerce(a);
    }

    if (typeof (b) === 'string') {
        b = semver.coerce(b);
    }

    const diff = semver.diff(a, b);

    // If a is less than or equal to b, it's automatically not a higher minor version
    if (semver.lte(a, b)) {
        return false;
    }

    // Otherwise compare; if different majors or minors then true, else false
    switch (diff) {
        case 'premajor':
        case 'major':
        case 'preminor':
        case 'minor':
            return true;
        default:
            return false;
    }
}
