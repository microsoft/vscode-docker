import vscode = require('vscode');

export function systemPrune() {

    let terminal = vscode.window.createTerminal("docker system prune");
    terminal.sendText(`docker system prune -f`);
    terminal.show();
    
}