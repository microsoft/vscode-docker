/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { openExternal } from "../utils/openExternal";

export interface OpenUrl {
    openUrl(): Promise<void>
}

export class OpenUrlTreeItem extends vscode.TreeItem implements OpenUrl {
    private _url: string;

    public constructor(label: string, url: string, iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon) {
        super(label);
        this._url = url;
        this.command = {
            command: 'vscode-docker.openUrl',
            arguments: [this],
            title: ''
        };

        this.iconPath = iconPath ?? new vscode.ThemeIcon('globe');
    }

    public async openUrl(): Promise<void> {
        await openExternal(this._url);
    }
}
