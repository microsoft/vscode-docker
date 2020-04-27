/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDockerContextListItem } from "../../utils/dockerContextManager";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalContextInfo implements ILocalItem {
    public data: IDockerContextListItem;
    public constructor(data: IDockerContextListItem) {
        this.data = data;
    }

    public get createdTime(): number {
        // No create time is provided by the docker.
        return -1;
    }

    public get treeId(): string {
        return `${this.data.Name}${this.data.Current}`;
    }
}
