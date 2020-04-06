/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import LocalOSProvider from '../utils/LocalOSProvider';
import { DockerInstallerBase } from './dockerInstallerBase';

class WindowsDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-windows-vscode';
    protected fileExtension: string = 'exe';
    protected installationMessage: string = localize('vscode-docker.commands.WindowsDockerInstaller.installationMessage', 'Installer is launched. Please follow the prompts to complete the installation, and then start the Docker Desktop.');
    protected getInstallCommand(fileName: string): string {
        // Windows require double quote.
        return `"${fileName}"`;
    }
}

class MacDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-mac-vscode';
    protected fileExtension: string = 'dmg';
    protected installationMessage: string = localize('vscode-docker.commands.MacDockerInstaller.installationMessage', 'Installer is launched. Please follow the prompts to complete the installation, and then start the Docker Desktop.');
    protected getInstallCommand(fileName: string): string {
        return `chmod +x '${fileName}' && open '${fileName}'`;
    }
}

class LinuxDockerInstaller extends DockerInstallerBase {
    protected downloadUrl: string = 'https://aka.ms/download-docker-linux-vscode';
    protected fileExtension: string = 'sh';
    protected installationMessage: string = localize('vscode-docker.commands.LinuxDockerInstaller.installationMessage', 'Please follow the prompt in terminal window to complete the installation, and then start Docker.');
    protected getInstallCommand(fileName: string): string {
        return `chmod +x '${fileName}' && sh '${fileName}'`;
    }

    protected async install(fileName: string): Promise<void> {
        const terminal = ext.terminalProvider.createTerminal(localize('vscode-docker.commands.LinuxDockerInstaller.terminalTitle', 'Docker Install.'));
        const command = this.getInstallCommand(fileName);
        terminal.sendText(command);
        terminal.show();
        return;
    }
}

export async function installDocker(context: IActionContext): Promise<void> {
    const osProvider = new LocalOSProvider();
    const dockerInstaller = osProvider.isMac
        ? new MacDockerInstaller()
        : osProvider.os === 'Windows'
            ? new WindowsDockerInstaller()
            : new LinuxDockerInstaller();
    await dockerInstaller.downloadAndInstallDocker();
}
