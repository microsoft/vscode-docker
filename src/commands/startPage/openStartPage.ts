/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';

let activePanel: vscode.WebviewPanel | undefined;

export async function openStartPage(context: IActionContext): Promise<void> {

    if (!activePanel) {
        activePanel = vscode.window.createWebviewPanel(
            'dockerStartPage',
            localize('vscode-docker.help.startPage.title', 'Docker: Getting Started'),
            vscode.ViewColumn.One,
            {
                enableCommandUris: true,
                localResourceRoots: [vscode.Uri.file(ext.context.asAbsolutePath('resources'))]
            }
        );

        activePanel.onDidDispose(() => {
            activePanel = undefined;
        });
    }

    activePanel.webview.html = await getWebviewContent(activePanel.webview);
}

async function getWebviewContent(webview: vscode.Webview): Promise<string> {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} file:;">
        <title>Cat Coding</title>
    </head>
    <body>
        <a href="command:vscode-docker.help">Hello</a>
        <div>Regular text</div>
        <img src="${webview.asWebviewUri(vscode.Uri.joinPath(ext.context.extensionUri, 'resources', (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark'), 'docker.svg'))}" width="300" />
    </body>
    </html>`;
}
