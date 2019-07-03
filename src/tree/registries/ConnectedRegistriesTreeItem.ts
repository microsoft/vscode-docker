/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { getThemedIconPath, IconPath } from "../IconPath";

export class ConnectedRegistriesTreeItem extends AzExtParentTreeItem {
    public contextValue: string = 'connectedRegistries';
    public childTypeLabel: string = 'registry';
    public label: string = 'Connected Registries';
    public children: AzExtTreeItem[] = [];

    public get iconPath(): IconPath {
        return getThemedIconPath('ConnectPlugged');
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.children;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
        return this.children.some(c => c.isAncestorOfImpl && c.isAncestorOfImpl(expectedContextValue));
    }
}
