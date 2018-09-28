import * as vscode from 'vscode';
import { BrowserClient } from './browserClient';

export interface Prerequisite {
    checkPrerequisite(): Promise<boolean>;
}

export class DotNetExtensionInstalledPrerequisite implements Prerequisite {
    constructor(
        private readonly browserClient: BrowserClient,
        // tslint:disable-next-line:no-any
        private readonly getExtension: (extensionId: string) => vscode.Extension<any>,
        private readonly showErrorMessage: (message: string, ...items: vscode.MessageItem[]) => Thenable<vscode.MessageItem>) {
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
