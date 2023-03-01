/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, ThemeIcon } from "vscode";

export class ConnectedRegistriesTreeItem extends AzExtParentTreeItem {
    public contextValue: string = 'connectedRegistries';
    public childTypeLabel: string = 'registry';
    public label: string = l10n.t('Connected Registries');
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
