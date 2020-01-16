/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, Event, EventEmitter, extensions } from "vscode";

export class AzureAccountExtensionListener extends Disposable {

    private static readonly extensionName: string = 'ms-vscode.azure-account';
    private static extensionInstalledEmitter: EventEmitter<boolean>;
    private static extensionsChangeEventListener: Disposable;

    public static get onExtensionInstalled(): Event<boolean> {
        // Subscribe to extensions change event only once.
        if (!AzureAccountExtensionListener.extensionsChangeEventListener) {
            AzureAccountExtensionListener.extensionsChangeEventListener = this.subscribeToExtensionsChange();
        }

        // If there were any previous subscribers to this event, dispose them so the old subscriber will not receive the event.
        if (AzureAccountExtensionListener.extensionInstalledEmitter) {
            AzureAccountExtensionListener.extensionInstalledEmitter.dispose();
        }
        AzureAccountExtensionListener.extensionInstalledEmitter = new EventEmitter<boolean>();
        return this.extensionInstalledEmitter.event;
    }

    private static subscribeToExtensionsChange(): Disposable {
        const listener: Disposable = extensions.onDidChange(() => {
            if (this.isExtensionInstalled(AzureAccountExtensionListener.extensionName)) {
                // Once the extension is installed, no need to continue listening for the event.
                AzureAccountExtensionListener.extensionInstalledEmitter.fire(true);
                AzureAccountExtensionListener.extensionInstalledEmitter.dispose();
                listener.dispose();
                AzureAccountExtensionListener.extensionsChangeEventListener = undefined;
            }
        });
        return listener;
    }

    private static isExtensionInstalled(extensionName: string): boolean {
        return extensions.getExtension(AzureAccountExtensionListener.extensionName) !== undefined;
    }

    public static dispose(): void {
        if (AzureAccountExtensionListener.extensionInstalledEmitter) {
            AzureAccountExtensionListener.extensionInstalledEmitter.dispose();
            AzureAccountExtensionListener.extensionInstalledEmitter = undefined;
        }
        if (AzureAccountExtensionListener.extensionsChangeEventListener) {
            AzureAccountExtensionListener.extensionsChangeEventListener.dispose();
            AzureAccountExtensionListener.extensionsChangeEventListener = undefined;
        }
    }
}
