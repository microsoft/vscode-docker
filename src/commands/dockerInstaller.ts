/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { TaskCommandRunnerFactory } from '../runtimes/runners/TaskCommandRunnerFactory';
import { runtimeInstallStatusProvider } from '../utils/RuntimeInstallStatusProvider';
import { streamToFile } from '../utils/httpRequest';
import { getTempFileName, isArm64Mac, isLinux } from '../utils/osUtils';

export abstract class DockerInstallerBase {
    protected abstract downloadUrl: string;
    protected abstract fileExtension: string;
    protected abstract getInstallCommand(fileName: string): string;

    public async downloadAndInstallDocker(context: IActionContext): Promise<void> {
        const shouldInstall: boolean = await this.preInstallCheck();
        if (shouldInstall) {
            const downloadingMessage: string = vscode.l10n.t('Downloading Docker installer...');
            const installationMessage: string = vscode.l10n.t('The Docker Desktop installation is started. Complete the installation and then start Docker Desktop.');
            let downloadedFileName: string;

            context.telemetry.properties.stage = 'download';
            try {
                downloadedFileName = await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: downloadingMessage },
                    async () => this.downloadInstaller());
            } catch (error) {
                const message = vscode.l10n.t('Downloading the Docker Desktop installer failed. Do you want to manually download and install?');
                const title = vscode.l10n.t('Download');
                this.handleError(context, message, title, this.downloadUrl);
                throw error;
            }

            context.telemetry.properties.stage = 'install';
            const command = this.getInstallCommand(downloadedFileName);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            vscode.window.showInformationMessage(installationMessage);
            try {
                await this.install(context, downloadedFileName, command);
            } catch (error) {
                const message = `${vscode.l10n.t('Docker Desktop installation failed')}. ${error}`;
                const title = vscode.l10n.t('Install Instruction');
                this.handleError(context, message, title, 'https://aka.ms/AA37qtj');
                throw error;
            }
        }
    }

    private async preInstallCheck(): Promise<boolean> {
        let proceedInstall = true;
        if (await runtimeInstallStatusProvider.isRuntimeInstalledRealTimeCheck()) {
            const reinstallMessage = vscode.l10n.t('Docker Desktop is already installed. Would you like to reinstall?');
            const install = vscode.l10n.t('Reinstall');
            const response = await vscode.window.showInformationMessage(reinstallMessage, ...[install]);
            proceedInstall = response !== undefined;
        }

        return proceedInstall;
    }

    private async downloadInstaller(): Promise<string> {
        const fileName = `${getTempFileName()}.${this.fileExtension}`;
        await streamToFile(this.downloadUrl, fileName);
        return fileName;
    }

    private handleError(context: IActionContext, message: string, title: string, url: string): void {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        vscode.window.showErrorMessage(message, { title: title }).then(response => { if (response) { vscode.env.openExternal(vscode.Uri.parse(url)); } });
        context.errorHandling.suppressReportIssue = true;
        context.errorHandling.suppressDisplay = true;
    }

    protected abstract install(context: IActionContext, fileName: string, cmd: string): Promise<void>;
}

export class WindowsDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-windows-vscode';
    protected fileExtension: string = 'exe';
    protected getInstallCommand(fileName: string): string {
        // Windows require double quote.
        return `"${fileName}"`;
    }

    protected async install(context: IActionContext, fileName: string): Promise<void> {
        const title = vscode.l10n.t('Docker Install');
        const command = this.getInstallCommand(fileName);

        const taskCRF = new TaskCommandRunnerFactory({
            taskName: title,
        });

        await taskCRF.getCommandRunner()({
            command: command,
            args: undefined,
        });
    }
}

export class MacDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = isArm64Mac() ? 'https://aka.ms/download-docker-arm-mac-vscode' : 'https://aka.ms/download-docker-mac-vscode';
    protected fileExtension: string = 'dmg';
    protected getInstallCommand(fileName: string): string {
        return `chmod +x '${fileName}' && open '${fileName}'`;
    }

    protected async install(context: IActionContext, fileName: string): Promise<void> {
        const title = vscode.l10n.t('Docker Install');
        const command = this.getInstallCommand(fileName);

        const taskCRF = new TaskCommandRunnerFactory({
            taskName: title,
        });

        await taskCRF.getCommandRunner()({
            command: command,
            args: undefined,
        });
    }
}

export async function showDockerInstallNotification(): Promise<void> {
    const installMessage = isLinux() ?
        vscode.l10n.t('Docker is not installed. Would you like to learn more about installing Docker?') :
        vscode.l10n.t('Docker Desktop is not installed. Would you like to install it?');

    const learnMore = vscode.l10n.t('Learn more');
    const install = vscode.l10n.t('Install');

    const confirmationPrompt: vscode.MessageItem = isLinux() ? { title: learnMore } : { title: install };
    const response = await vscode.window.showInformationMessage(installMessage, ...[confirmationPrompt]);
    if (response) {
        await vscode.commands.executeCommand('vscode-docker.installDocker');
    }
}

