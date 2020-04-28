/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDockerContextListItem } from "../../utils/dockerContextManager";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Wrapper class to provide Docker context information.
 */
export class LocalContextInfo implements ILocalItem {
    public data: IDockerContextListItem;
    public createdTime: number = -1;

    public constructor(data: IDockerContextListItem) {
        this.data = data;
    }

    public get treeId(): string {
        // treeid is used in determining whether the treeItems are changed or not.
        // Appending the current selected context will help refreshing the tree view when the selection change.
        return `${this.data.Name}${this.data.Current}`;
    }
}
