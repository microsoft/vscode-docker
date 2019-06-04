/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, GenericTreeItem } from "vscode-azureextensionui";
import { openExternal } from "../utils/openExternal";
import { treeUtils } from "../utils/treeUtils";

export class OpenUrlTreeItem extends GenericTreeItem {
    private _url: string;

    constructor(parent: AzExtParentTreeItem, label: string, url: string) {
        super(parent, {
            commandId: 'vscode-docker.openUrl',
            contextValue: 'openUrl',
            iconPath: treeUtils.getThemedIconPath('web'),
            includeInTreeItemPicker: true,
            label
        });
        this._url = url;
    }

    public async openUrl(): Promise<void> {
        await openExternal(this._url);
    }
}
