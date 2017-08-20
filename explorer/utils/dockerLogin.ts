import * as vscode from 'vscode';
import * as dockerHubAPI from 'docker-hub-api';

export async function dockerHubLogin(): Promise<string> {

    const username: string = await vscode.window.showInputBox({ prompt: 'Username' });
    if (username) {
        const password: string = await vscode.window.showInputBox({ prompt: 'Password', password: true });
        if (password) {
            const token: any = await dockerHubAPI.login(username, password);
            if (token) {
                return Promise.resolve(<string>token.token);
            }
        }
    }

    return Promise.reject(null);

}