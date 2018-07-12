import vscode = require('vscode');
import { IAzureUserInput, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from "../extensionVariables";

export type OS = 'Windows' | 'Linux';
export type Platform = 'Go' |
    'Java' |
    '.NET Core Console' |
    'ASP.NET Core' |
    'Node.js' |
    'Python' |
    'Other';

/**
 * Prompts for a port number
 * @throws `UserCancelledError` if the user cancels.
 */
export async function promptForPort(port: number): Promise<string> {
    var opt: vscode.InputBoxOptions = {
        placeHolder: `${port}`,
        prompt: 'What port does your app listen on?',
        value: `${port}`
    }

    return ext.ui.showInputBox(opt);
}

/**
 * Prompts for a platform
 * @throws `UserCancelledError` if the user cancels.
 */
export async function quickPickPlatform(): Promise<Platform> {
    var opt: vscode.QuickPickOptions = {
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
    var opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Operating System'
    }

    const OSes: OS[] = ['Windows', 'Linux'];
    const items = OSes.map(p => <IAzureQuickPickItem<OS>>{ label: p, data: p });

    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}
