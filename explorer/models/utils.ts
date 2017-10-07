import * as vscode from 'vscode';
import * as dockerHubAPI from 'docker-hub-api';
import * as keytarType from 'keytar';

export async function dockerHubLogin(): Promise<{ username: string, password: string, token: string }> {

    const username: string = await vscode.window.showInputBox({ prompt: 'Username' });
    if (username) {
        const password: string = await vscode.window.showInputBox({ prompt: 'Password', password: true });
        if (password) {
            const token: any = await dockerHubAPI.login(username, password);
            if (token) {
                return { username: username, password: password, token: <string>token.token };
            }
        }
    }

    return;

}

export function dockerHubLogout(): void {
   
    const keytar: typeof keytarType = require(`${vscode.env.appRoot}/node_modules/keytar`);
    if (keytar) {
        keytar.deletePassword('vscode-docker', 'dockerhub.token');
        keytar.deletePassword('vscode-docker', 'dockerhub.password');
        keytar.deletePassword('vscode-docker', 'dockerhub.username');
    }
    dockerHubAPI.setLoginToken(null);
}

