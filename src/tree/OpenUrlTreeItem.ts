/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtParentTreeItem, GenericTreeItem } from "vscode-azureextensionui";
import { openExternal } from "../utils/openExternal";
import { getThemedIconPath } from "./IconPath";

export class OpenUrlTreeItem extends GenericTreeItem {
    private _url: string;

    public constructor(parent: AzExtParentTreeItem, label: string, url: string, iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon) {
        super(parent, {
            commandId: 'vscode-docker.openUrl',
            contextValue: 'openUrl',
            iconPath: iconPath ?? getThemedIconPath('web'),
            includeInTreeItemPicker: true,
            label
        });
        this._url = url;
    }

    public async openUrl(): Promise<void> {
        await openExternal(this._url);
    }
}
