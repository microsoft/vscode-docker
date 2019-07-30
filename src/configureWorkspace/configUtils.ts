/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from "../extensionVariables";
import { Platform, PlatformOS } from '../utils/platform';

/**
 * Prompts for port numbers
 * @throws `UserCancelledError` if the user cancels.
 */
export async function promptForPorts(ports: number[]): Promise<number[]> {
    let opt: vscode.InputBoxOptions = {
        placeHolder: ports.join(', '),
        prompt: 'What port(s) does your app listen on? Enter a comma-separated list, or empty for no exposed port.',
        value: ports.join(', '),
        validateInput: (value: string): string | undefined => {
            let result = splitPorts(value);
            if (!result) {
                return 'Ports must be a comma-separated list of positive integers (1 to 65535), or empty for no exposed port.';
            }

            return undefined;
        }
    }

    return splitPorts(await ext.ui.showInputBox(opt));
}

function splitPorts(value: string): number[] | undefined {
    value = value ? value : '';
    let matches = value.match(/\d+/g);

    if (!matches && value !== '') {
        return undefined;
    } else if (!matches) {
        return []; // Empty list
    }

    let ports = matches.map(Number);

    // If anything is non-integral or less than 1 or greater than 65535, it's not valid
    if (ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535)) {
        return undefined;
    }

    return ports;
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
        'C++',
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
export async function quickPickOS(): Promise<PlatformOS> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Operating System'
    }

    const OSes: PlatformOS[] = ['Windows', 'Linux'];
    const items = OSes.map(p => <IAzureQuickPickItem<PlatformOS>>{ label: p, data: p });

    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}
