import vscode = require('vscode');


export function promptForPort() : Thenable<string>{

    var opt: vscode.InputBoxOptions = {
        prompt: 'What port does your app listen on?',
        value: '3000',
        placeHolder: '3000'
    }

    return vscode.window.showInputBox(opt);

}

export function quickPickPlatform() : Thenable<string>{

    var opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Application Platform'
    }

    var items: string[] = [];
    items.push('NodeJs');
    items.push('go');
    items.push('.NET Core');
    items.push('Other');
    
    return vscode.window.showQuickPick(items, opt);
    
}
