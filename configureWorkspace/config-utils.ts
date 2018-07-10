import vscode = require('vscode');

export async function promptForPort(port: number): Promise<string> {
    var opt: vscode.InputBoxOptions = {
        placeHolder: `${port}`,
        prompt: 'What port does your app listen on?',
        value: `${port}`
    }

    return vscode.window.showInputBox(opt);
}

export async function quickPickPlatform(): Promise<string> {
    var opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Application Platform'
    }

    const items: string[] = [];
    items.push('Go');
    items.push('Java');
    items.push('.NET Core Console');
    items.push('ASP.NET Core');
    items.push('Node.js');
    items.push('Python');
    items.push('Other');

    return vscode.window.showQuickPick(items, opt);
}

export async function quickPickOS(): Promise<string> {
    var opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Operating System'
    }

    const items: string[] = ['Windows', 'Linux'];

    return vscode.window.showQuickPick(items, opt);
}
