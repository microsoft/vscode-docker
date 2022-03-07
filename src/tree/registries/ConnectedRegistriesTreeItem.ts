/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { localize } from '../../localize';

export class ConnectedRegistriesTreeItem extends AzExtParentTreeItem {
    public contextValue: string = 'connectedRegistries';
    public childTypeLabel: string = 'registry';
    public label: string = localize('vscode-docker.tree.registries.connectedRegistriesLabel', 'Connected Registries');
    public children: AzExtTreeItem[] = [];

    public constructor(parent: AzExtParentTreeItem | undefined) {
        super(parent);
        this.iconPath = new ThemeIcon('link');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.children;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
        return this.children.some(c => c.isAncestorOfImpl && c.isAncestorOfImpl(expectedContextValue));
    }
}
