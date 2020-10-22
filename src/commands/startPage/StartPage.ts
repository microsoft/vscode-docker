/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { cryptoUtils } from '../../utils/cryptoUtils';

type WebviewMessage = { command: string, [key: string]: string };

class StartPage {
    private activePanel: vscode.WebviewPanel | undefined;

    public async createOrShow(context: IActionContext): Promise<void> {
        const resourcesRoot = vscode.Uri.joinPath(ext.context.extensionUri, 'resources');
        const codiconsRoot = vscode.Uri.joinPath(ext.context.extensionUri, 'node_modules', 'vscode-codicons', 'dist');

        if (!this.activePanel) {
            this.activePanel = vscode.window.createWebviewPanel(
                'vscode-docker.startPage',
                localize('vscode-docker.help.startPage.title', 'Docker: Getting Started'),
                vscode.ViewColumn.One,
                {
                    enableCommandUris: true,
                    enableScripts: true,
                    localResourceRoots: [resourcesRoot, codiconsRoot],
                }
            );

            const listener = this.activePanel.webview.onDidReceiveMessage(async (message: WebviewMessage) => this.handleMessage(message));

            this.activePanel.onDidDispose(() => {
                this.activePanel = undefined;
                listener.dispose();
            });
        }

        this.activePanel.webview.html = await this.getWebviewHtml(resourcesRoot, codiconsRoot);
        this.activePanel.reveal();
    }

    private async getWebviewHtml(resourcesRoot: vscode.Uri, codiconsRoot: vscode.Uri): Promise<string> {
        const webview = this.activePanel.webview;
        const themedResourcesPath = vscode.Uri.joinPath(resourcesRoot, vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark');

        const codiconsStyleUri = webview.asWebviewUri(vscode.Uri.joinPath(codiconsRoot, 'codicon.css'));
        const codiconsFontUri = webview.asWebviewUri(vscode.Uri.joinPath(codiconsRoot, 'codicon.ttf'));

        const nonce = cryptoUtils.getRandomHexString(8);

        return `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} file:; script-src 'nonce-${nonce}'; font-src ${codiconsFontUri}; style-src ${webview.cspSource} ${codiconsStyleUri} 'nonce-${nonce}';">
                    <link href="${codiconsStyleUri}" rel="stylesheet" />
                    <title>Docker: Getting Started</title>

                    <style nonce="${nonce}">
                        #icons {
                            display: flex;
                            flex-wrap: wrap;
                            align-items: center;
                            justify-content: center;
                        }

                        #icons .icon {
                            width: 140px;
                            padding: 20px;
                            font-size: 14px;
                            display: flex;
                            flex-direction: column;
                            text-align: center;
                        }

                        #icons .icon .codicon {
                            font-size: 32px;
                            padding-bottom: 16px;
                        }
                    </style>
                </head>
                <body>
                    <a href="command:vscode-docker.help">Hello</a>
                    <div>Regular text</div>
                    <img src="${webview.asWebviewUri(vscode.Uri.joinPath(themedResourcesPath, 'docker.svg'))}" width="300" />
                    <input type="checkbox" id="showStartPage" ${vscode.workspace.getConfiguration('docker').get('showStartPage', false) ? 'checked' : ''} />
                    <label for="showStartPage">Show this page when a new update to the Docker extension is released</label>

                    <div id="icons"><div class="icon"><i class="codicon codicon-account"></i>account</div></div>
                </body>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    const showStartPageCheckbox = document.getElementById('showStartPage');

                    showStartPageCheckbox.addEventListener('click', function() {
                        vscode.postMessage({
                            command: 'showStartPageClicked',
                            showStartPage: showStartPageCheckbox.checked
                        });
                    });
                </script>
            </html>`;
    }

    private async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'showStartPageClicked':
                await vscode.workspace.getConfiguration('docker').update('showStartPage', message.showStartPage, true);
                break;
            default:
        }
    }
}

export const startPage = new StartPage();
