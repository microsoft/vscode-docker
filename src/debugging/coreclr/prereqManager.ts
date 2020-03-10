/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { OSProvider } from '../../utils/LocalOSProvider';
import { ProcessProvider } from './ChildProcessProvider';
import { DockerClient } from './CliDockerClient';
import { DotNetClient } from './CommandLineDotNetClient';
import { LaunchOptions, MacNuGetPackageFallbackFolderPath } from './dockerManager';
import { FileSystemProvider } from './fsProvider';
import { BrowserClient } from './OpnBrowserClient';

export interface Prerequisite {
    checkPrerequisite(options: LaunchOptions): Promise<boolean>;
}

export type ShowErrorMessageFunction = (message: string, ...items: vscode.MessageItem[]) => Thenable<vscode.MessageItem | undefined>;

export class DockerDaemonIsLinuxPrerequisite implements Prerequisite {
    public constructor(
        private readonly dockerClient: DockerClient,
        private readonly showErrorMessage: ShowErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        const daemonOsJson = await this.dockerClient.getVersion({ format: '{{json .Server.Os}}' });
        const daemonOs = JSON.parse(daemonOsJson.trim());

        if (daemonOs === 'linux') {
            return true;
        }

        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.showErrorMessage(localize('vscode-docker.debug.coreclr.onlyLinux', 'The Docker daemon is not configured to run Linux containers. Only Linux containers can be used for .NET Core debugging.'))

        return false;
    }
}

export class DotNetExtensionInstalledPrerequisite implements Prerequisite {
    public constructor(
        private readonly browserClient: BrowserClient,
        private readonly getExtension: (extensionId: string) => vscode.Extension<unknown> | undefined,
        private readonly showErrorMessage: ShowErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        // NOTE: Debugging .NET Core in Docker containers requires the C# (i.e. .NET Core debugging) extension.
        //       As this extension targets Docker in general and not .NET Core in particular, we don't want the
        //       extension as a whole to depend on it.  Hence, we only check for its existence if/when asked to
        //       debug .NET Core in Docker containers.
        const dependenciesSatisfied = this.getExtension('ms-vscode.csharp') !== undefined;

        if (!dependenciesSatisfied) {
            const openExtensionInGallery: vscode.MessageItem = {
                title: 'View extension in gallery'
            };

            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            this
                .showErrorMessage(
                    localize('vscode-docker.debug.coreclr.installCSharp', 'To debug .NET Core in Docker containers, install the C# extension for VS Code.'),
                    openExtensionInGallery)
                .then(result => {
                    if (result === openExtensionInGallery) {
                        this.browserClient.openBrowser('https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp');
                    }
                });
        }

        return await Promise.resolve(dependenciesSatisfied);
    }
}

export class DotNetSdkInstalledPrerequisite implements Prerequisite {
    public constructor(
        private readonly dotNetClient: DotNetClient,
        private readonly showErrorMessage: ShowErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        const result = await this.dotNetClient.getVersion();

        if (result) {
            return true;
        }

        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.showErrorMessage(localize('vscode-docker.debug.coreclr.netCoreSdk', 'The .NET Core SDK must be installed to debug .NET Core applications running within Docker containers.'));

        return false;
    }
}

type DockerSettings = {
    filesharingDirectories?: string[];
};

export class LinuxUserInDockerGroupPrerequisite implements Prerequisite {
    public constructor(
        private readonly osProvider: OSProvider,
        private readonly processProvider: ProcessProvider,
        private readonly showErrorMessage: ShowErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        if (this.osProvider.os !== 'Linux' || this.osProvider.isMac) {
            return true;
        }

        const result = await this.processProvider.exec('id -Gn', {});
        const groups = result.stdout.trim().split(' ');
        const inDockerGroup = groups.find(group => group === 'docker') !== undefined;

        if (inDockerGroup) {
            return true;
        }

        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.showErrorMessage(localize('vscode-docker.debug.coreclr.dockerGroup', 'The current user is not a member of the "docker" group. Add it using the command "sudo usermod -a -G docker $USER".'))

        return false;
    }
}

export class MacNuGetFallbackFolderSharedPrerequisite implements Prerequisite {
    public constructor(
        private readonly fileSystemProvider: FileSystemProvider,
        private readonly osProvider: OSProvider,
        private readonly showErrorMessage: ShowErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        if (!this.osProvider.isMac) {
            // Only Mac requires this folder be specifically shared.
            return true;
        }

        const settingsPath = path.posix.join(this.osProvider.homedir, 'Library/Group Containers/group.com.docker/settings.json');

        if (!await this.fileSystemProvider.fileExists(settingsPath)) {
            // Docker versions earlier than 17.12.0-ce-mac46 may not have the settings file.
            return true;
        }

        const settingsContent = await this.fileSystemProvider.readFile(settingsPath);
        const settings = <DockerSettings>JSON.parse(settingsContent);

        if (settings === undefined || settings.filesharingDirectories === undefined) {
            // Docker versions earlier than 17.12.0-ce-mac46 may not have the property.
            return true;
        }

        if (settings.filesharingDirectories.find(directory => directory === MacNuGetPackageFallbackFolderPath) !== undefined) {
            return true;
        }

        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this.showErrorMessage(localize('vscode-docker.debug.coreclr.shareNugetFolder', 'To debug .NET Core in Docker containers, add "{0}" as a shared folder in your Docker preferences.', MacNuGetPackageFallbackFolderPath));

        return false;
    }
}

export class DockerfileExistsPrerequisite implements Prerequisite {
    public constructor(
        private readonly fsProvider: FileSystemProvider,
        private readonly showErrorMessage: ShowErrorMessageFunction,
        private readonly executeCommand: (command: string) => void) {
    }

    public async checkPrerequisite(options: LaunchOptions): Promise<boolean> {
        if (await this.fsProvider.fileExists(options.build.dockerfile)) {
            return true;
        }

        const addDockerFiles: vscode.MessageItem = {
            title: localize('vscode-docker.debug.coreclr.addDockerFilesButton', 'Add Docker files')
        };

        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        this
            .showErrorMessage(
                localize('vscode-docker.debug.coreclr.noDockerfile', 'Couldn\'t find a Dockerfile in your workspace.Would you like to add Docker files to the workspace ? '),
                addDockerFiles)
            .then(result => {
                if (result === addDockerFiles) {
                    this.executeCommand('vscode-docker.configure');
                }
            });

        return false;
    }
}

export class AggregatePrerequisite implements Prerequisite {
    private readonly prerequisites: Prerequisite[];

    public constructor(...prerequisites: Prerequisite[]) {
        this.prerequisites = prerequisites;
    }

    public async checkPrerequisite(options: LaunchOptions): Promise<boolean> {
        const results = await Promise.all(this.prerequisites.map(async prerequisite => await prerequisite.checkPrerequisite(options)));

        return results.every(result => result);
    }
}
