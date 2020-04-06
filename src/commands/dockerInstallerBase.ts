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

export abstract class DockerInstallerBase {
    protected abstract downloadUrl: string;
    protected abstract fileExtension: string;
    protected abstract installationMessage: string;
    protected abstract getInstallCommand(fileName: string): string;

    public async downloadAndInstallDocker(): Promise<void> {
        const confirmInstall: string = localize('vscode-docker.commands.DockerInstallerBase.confirm', 'Are you sure you want to install docker on this machine.');
        const installTitle: string = localize('vscode-docker.commands.DockerInstallerBase.install', 'Install');
        const downloadingMessage: string = localize('vscode-docker.commands.DockerInstallerBase.downloading', 'Downloading Docker installer...');
        const downloadCompleteMessage: string = localize('vscode-docker.commands.DockerInstallerBase.downloadCompleteMessage', 'Download completed');
        let downloadedFileName: string;

        // no need to check result - cancel will throw a UserCancelledError
        await ext.ui.showWarningMessage(confirmInstall, { modal: true }, { title: installTitle });

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: downloadingMessage },
            async () => {
                downloadedFileName = await this.downloadInstaller();
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                vscode.window.showInformationMessage(downloadCompleteMessage);
            }
        );

        const command = this.getInstallCommand(downloadedFileName);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        vscode.window.showInformationMessage(this.installationMessage);
        await this.install(downloadedFileName, command);
    }

    private async downloadInstaller(): Promise<string> {
        const osProvider = new LocalOSProvider();
        const processProvider = new ChildProcessProvider();
        const tempFileProvider = new OSTempFileProvider(osProvider, processProvider);
        let fileName = tempFileProvider.getTempFilename('docker', this.fileExtension);
        await streamToFile(this.downloadUrl, fileName);
        return fileName;
    }

    protected async install(fileName: string, cmd: string): Promise<void> {
        const fsProvider = new LocalFileSystemProvider();
        try {
            const processProvider = new ChildProcessProvider();
            ext.outputChannel.appendLine(localize('vscode-docker.commands.DockerInstallerBase.downloadCompleteMessage', 'Executing command {0}', cmd));
            await processProvider.exec(cmd, {});
        } finally {
            if (await fsProvider.fileExists(fileName)) {
                await fsProvider.unlinkFile(fileName);
            }
        }
    }
}
