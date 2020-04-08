/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import ChildProcessProvider from '../debugging/coreclr/ChildProcessProvider';
import { LocalFileSystemProvider } from '../debugging/coreclr/fsProvider';
import { OSTempFileProvider } from '../debugging/coreclr/tempFileProvider';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { streamToFile } from '../utils/httpRequest';
import LocalOSProvider from '../utils/LocalOSProvider';
import { execAsync } from '../utils/spawnAsync';

export abstract class DockerInstallerBase {
    protected abstract downloadUrl: string;
    protected abstract fileExtension: string;
    protected abstract getInstallCommand(fileName: string): string;

    public async downloadAndInstallDocker(): Promise<void> {
        const confirmInstall: string = localize('vscode-docker.commands.DockerInstallerBase.confirm', 'Are you sure you want to install Docker on this machine?');
        const installTitle: string = localize('vscode-docker.commands.DockerInstallerBase.install', 'Install');
        const downloadingMessage: string = localize('vscode-docker.commands.DockerInstallerBase.downloading', 'Downloading Docker installer...');
        const installationMessage: string = localize('vscode-docker.commands.DockerInstallerBase.installationMessage', 'Opening the Docker Desktop installer...');

        // no need to check result - cancel will throw a UserCancelledError
        await ext.ui.showWarningMessage(confirmInstall, { modal: true }, { title: installTitle });

        const downloadedFileName: string = await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: downloadingMessage },
            async () => this.downloadInstaller());

        const command = this.getInstallCommand(downloadedFileName);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        vscode.window.showInformationMessage(installationMessage);
        await this.install(downloadedFileName, command);
    }

    private async downloadInstaller(): Promise<string> {
        const osProvider = new LocalOSProvider();
        const processProvider = new ChildProcessProvider();
        const tempFileProvider = new OSTempFileProvider(osProvider, processProvider);
        const fileName = tempFileProvider.getTempFilename('docker', this.fileExtension);
        await streamToFile(this.downloadUrl, fileName);
        return fileName;
    }

    protected abstract install(fileName: string, cmd: string): Promise<void>;
}

export class WindowsDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-windows-vscode';
    protected fileExtension: string = 'exe';
    protected getInstallCommand(fileName: string): string {
        // Windows require double quote.
        return `"${fileName}"`;
    }

    protected async install(fileName: string, cmd: string): Promise<void> {
        const fsProvider = new LocalFileSystemProvider();
        try {
            ext.outputChannel.appendLine(localize('vscode-docker.commands.DockerInstallerBase.downloadCompleteMessage', 'Executing command {0}', cmd));
            await execAsync(cmd);
        } finally {
            if (await fsProvider.fileExists(fileName)) {
                await fsProvider.unlinkFile(fileName);
            }
        }
    }
}

export class MacDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-mac-vscode';
    protected fileExtension: string = 'dmg';
    protected getInstallCommand(fileName: string): string {
        return `chmod +x '${fileName}' && open '${fileName}'`;
    }

    protected async install(fileName: string): Promise<void> {
        const terminal = ext.terminalProvider.createTerminal(localize('vscode-docker.commands.MacDockerInstaller.terminalTitle', 'Docker Install'));
        const command = this.getInstallCommand(fileName);
        terminal.sendText(command);
        terminal.show();
    }
}
