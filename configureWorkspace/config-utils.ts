/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNumber } from 'util';
import vscode = require('vscode');
import { IAzureQuickPickItem, IAzureUserInput } from 'vscode-azureextensionui';
import { ext } from "../extensionVariables";

export type OS = 'Windows' | 'Linux';
export type Platform =
    'Go' |
    'Java' |
    '.NET Core Console' |
    'ASP.NET Core' |
    'Node.js' |
    'Python' |
    'Ruby' |
    'Other';

/**
 * Prompts for a port number
 * @throws `UserCancelledError` if the user cancels.
 */
export async function promptForPort(port: string): Promise<string> {
    let opt: vscode.InputBoxOptions = {
        placeHolder: `${port}`,
        prompt: 'What port does your app listen on? ENTER for none.',
        value: `${port}`,
        validateInput: (value: string): string | undefined => {
            if (value && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
                return 'Port must be a positive integer or else empty for no exposed port';
            }

            return undefined;
        }
    }

    return ext.ui.showInputBox(opt);
}

/**
 * Prompts for a platform
 * @throws `UserCancelledError` if the user cancels.
 */
export async function quickPickPlatform(): Promise<Platform> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Application Platform'
    }

    const platforms: Platform[] = [
        'Go',
        'Java',
        '.NET Core Console',
        'ASP.NET Core',
        'Node.js',
        'Python',
        'Ruby',
        'Other'
    ];

    const items = platforms.map(p => <IAzureQuickPickItem<Platform>>{ label: p, data: p });
    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}

/**
 * Prompts for an OS
 * @throws `UserCancelledError` if the user cancels.
 */
export async function quickPickOS(): Promise<OS> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Operating System'
    }

    const OSes: OS[] = ['Windows', 'Linux'];
    const items = OSes.map(p => <IAzureQuickPickItem<OS>>{ label: p, data: p });

    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}
