/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { cryptoUtils } from '../../utils/cryptoUtils';
import { getHandlebarsWithHelpers } from '../../utils/getHandlebarsWithHelpers';
import { isMac } from '../../utils/osUtils';

type WebviewMessage = { command: string, [key: string]: string };

interface StartPageContext {
    cspSource: string;
    nonce: string;
    codiconsFontUri: string;
    codiconsStyleUri: string;
    dockerIconUri: string;
    showStartPageChecked: 'checked' | '';
    isMac: boolean;
    showWhatsNew: boolean;
}

class StartPage {
    private activePanel: vscode.WebviewPanel | undefined;

    public async createOrShow(context: IActionContext): Promise<void> {
        const resourcesRoot = vscode.Uri.joinPath(ext.context.extensionUri, 'resources');

        if (!this.activePanel) {
            const template = await this.getTemplate(resourcesRoot);

            let showWhatsNew = false;
            try {
                showWhatsNew = !!(await ext.experimentationService.isLiveFlightEnabled('vscode-docker.whatsNew'));
            } catch {
                // Best effort
            }

            // createOrShow() might have been called multiple times in short timeframe
            if (!this.activePanel) {
                this.doCreatePanel(resourcesRoot, showWhatsNew, template);
            }
        }

        this.activePanel.reveal();
    }

    private doCreatePanel(resourcesRoot: vscode.Uri, showWhatsNew: boolean, template: HandlebarsTemplateDelegate<unknown>) {
        // If we're using the bundled version, the codicons root URI is at <extensionRoot>/dist/node_modules/@vscode/codicons/dist
        // If we're not using the bundled version, the codicons root URI is <extensionRoot>/node_modules/@vscode/codicons/dist
        const codiconsRoot = vscode.Uri.joinPath(ext.context.extensionUri, ...ext.ignoreBundle ? ['node_modules'] : ['dist', 'node_modules'], '@vscode', 'codicons', 'dist');

        this.activePanel = vscode.window.createWebviewPanel(
            'vscode-docker.startPage',
            localize('vscode-docker.help.startPage.title', 'Docker - Get Started'),
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

        const webview = this.activePanel.webview;

        const startPageContext: StartPageContext = {
            cspSource: webview.cspSource,
            nonce: cryptoUtils.getRandomHexString(8),
            codiconsFontUri: webview.asWebviewUri(vscode.Uri.joinPath(codiconsRoot, 'codicon.ttf')).toString(),
            codiconsStyleUri: webview.asWebviewUri(vscode.Uri.joinPath(codiconsRoot, 'codicon.css')).toString(),
            dockerIconUri: webview.asWebviewUri(vscode.Uri.joinPath(resourcesRoot, 'docker_blue.png')).toString(),
            showStartPageChecked: vscode.workspace.getConfiguration('docker').get('showStartPage', false) ? 'checked' : '',
            isMac: isMac(),
            showWhatsNew: showWhatsNew,
        };

        this.activePanel.webview.html = template(startPageContext);
    }

    private async handleMessage(message: WebviewMessage): Promise<void> {
        switch (message.command) {
            case 'showStartPageClicked':
                await callWithTelemetryAndErrorHandling('showStartPage.checkboxClicked', async (context: IActionContext) => {
                    context.telemetry.properties.newValue = message.showStartPage;
                    await vscode.workspace.getConfiguration('docker').update('showStartPage', Boolean(message.showStartPage), vscode.ConfigurationTarget.Global);
                });
                break;
            default:
        }
    }

    private async getTemplate(resourcesRoot: vscode.Uri): Promise<HandlebarsTemplateDelegate<unknown>> {
        const templatePath = vscode.Uri.joinPath(resourcesRoot, 'startPage.html.template');
        const Handlebars = await getHandlebarsWithHelpers();
        return Handlebars.compile(await fse.readFile(templatePath.fsPath, 'utf-8'));
    }
}

export const startPage = new StartPage();
