/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, EventEmitter, extensions } from "vscode";

export class ExtensionUtils {
    private extensionName: string;
    private readonly extensionInstalledEmitter: EventEmitter<boolean> = new EventEmitter<boolean>();

    public readonly onExtensionInstalled: Event<boolean> = this.extensionInstalledEmitter.event;

    constructor(extensionName: string) {
        this.extensionName = extensionName;
        this.subscribeToExtensionChange();
    }

    private subscribeToExtensionChange(): void {
        if (this.isExtensionInstalled(this.extensionName)) {
            this.extensionInstalledEmitter.fire(true);
        }

        extensions.onDidChange(() => {
            if (this.isExtensionInstalled(this.extensionName)) {
                this.extensionInstalledEmitter.fire(true);
            }
        });
    }

    private isExtensionInstalled(extensionName: string): boolean {
        return extensions.getExtension(this.extensionName) !== undefined;
    }
}
