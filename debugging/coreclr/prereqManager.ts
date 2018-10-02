/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { BrowserClient } from './browserClient';
import { MacNuGetPackageFallbackFolderPath } from './dockerManager';
import { FileSystemProvider } from './fsProvider';
import { OSProvider } from './osProvider';

export interface Prerequisite {
    checkPrerequisite(): Promise<boolean>;
}

type showErrorMessageFunction = (message: string, ...items: vscode.MessageItem[]) => Thenable<vscode.MessageItem>;

export class DotNetExtensionInstalledPrerequisite implements Prerequisite {
    constructor(
        private readonly browserClient: BrowserClient,
        // tslint:disable-next-line:no-any
        private readonly getExtension: (extensionId: string) => vscode.Extension<any>,
        private readonly showErrorMessage: showErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        // NOTE: Debugging .NET Core in Docker containers requires the C# (i.e. .NET Core debugging) extension.
        //       As Docker debugging is experimental, we don't want the extension as a whole to depend on it.
        //       Hence, we only check for its existence if/when asked to debug .NET Core in Docker containers.
        const dependenciesSatisfied = this.getExtension('ms-vscode.csharp') !== undefined;

        if (!dependenciesSatisfied) {
            const openExtensionInGallery: vscode.MessageItem = {
                title: 'View extension in gallery'
            };

            this
                .showErrorMessage(
                    'To debug .NET Core in Docker containers, install the C# extension for VS Code.',
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

type DockerSettings = {
    filesharingDirectories?: string[];
};

export class MacNuGetFallbackFolderSharedPrerequisite implements Prerequisite {
    constructor(
        private readonly fileSystemProvider: FileSystemProvider,
        private readonly osProvider: OSProvider,
        private readonly showErrorMessage: showErrorMessageFunction) {
    }

    public async checkPrerequisite(): Promise<boolean> {
        if (this.osProvider.os !== 'Linux') {
            return true;
        }

        const settingsPath = path.join(this.osProvider.homedir, 'Library/Group Containers/group.com.docker/settings.json');

        if (await this.fileSystemProvider.fileExists(settingsPath)) {
            const settingsContent = await this.fileSystemProvider.readFile(settingsPath);
            const settings = <DockerSettings>JSON.parse(settingsContent);

            if (settings.filesharingDirectories && settings.filesharingDirectories.find(directory => directory === MacNuGetPackageFallbackFolderPath) !== undefined) {
                return true;
            }
        }

        this.showErrorMessage(`To debug .NET Core in Docker containers, add "${MacNuGetPackageFallbackFolderPath}" as a shared folder in your Docker preferences.`);

        return false;
    }
}

export class AggregatePrerequisite implements Prerequisite {
    private readonly prerequisites: Prerequisite[];

    constructor(...prerequisites: Prerequisite[]) {
        this.prerequisites = prerequisites;
    }

    public async checkPrerequisite(): Promise<boolean> {
        const results = await Promise.all(this.prerequisites.map(async prerequisite => await prerequisite.checkPrerequisite()));

        return results.every(result => result);
    }
}
