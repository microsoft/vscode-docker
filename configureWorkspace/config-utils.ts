import vscode = require('vscode');

export function promptForPort(): Thenable<string>{
    var opt: vscode.InputBoxOptions = {
        placeHolder: '3000',
        prompt: 'What port does your app listen on?',
        value: '3000'
    }

    return vscode.window.showInputBox(opt);
}

export function quickPickPlatform(): Thenable<string>{
    var opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Application Platform'
    }

    var items: string[] = [];
    items.push('Go');
    items.push('.NET Core');
    items.push('Node.js');
    items.push('Other');
    
    return vscode.window.showQuickPick(items, opt); 
}
