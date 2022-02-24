/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { RequestLike } from "../../utils/httpRequest";
import { IRepositoryAuthTreeItem } from "../../utils/registryRequestUtils";
import { getRegistryContextValue, repositorySuffix } from "./registryContextValues";
import { RegistryTreeItemBase } from "./RegistryTreeItemBase";
import { RemoteTagTreeItem } from "./RemoteTagTreeItem";

/**
 * Base class for all repositories
 */
export abstract class RemoteRepositoryTreeItemBase extends AzExtParentTreeItem implements IRepositoryAuthTreeItem {
    public childTypeLabel: string = 'tag';
    public parent: RegistryTreeItemBase;
    public repoName: string;

    public constructor(parent: RegistryTreeItemBase, repoName: string) {
        super(parent);
        this.repoName = repoName;
        this.iconPath = new ThemeIcon('repo');
    }

    public get label(): string {
        return this.repoName;
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, repositorySuffix);
    }

    /**
     * Optional method to implement if repo-level requests should have different authentication than registry-level requests
     * For example, if the registry supports OAuth you might get a token that has just repo-level permissions instead of registry-level permissions
     */
    public signRequest?(request: RequestLike): Promise<RequestLike>;

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (ti1 instanceof RemoteTagTreeItem && ti2 instanceof RemoteTagTreeItem) {
            return ti2.time.valueOf() - ti1.time.valueOf();
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }
}
