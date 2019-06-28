/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkInspectInfo } from "dockerode";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalNetworkInfo implements ILocalItem {
    public data: NetworkInspectInfo;
    public constructor(data: NetworkInspectInfo) {
        this.data = data;
    }

    public get createdTime(): number {
        return new Date(this.data.Created).valueOf();
    }

    public get networkName(): string {
        return this.data.Name;
    }

    public get networkDriver(): string {
        return this.data.Driver;
    }

    public get networkId(): string {
        return this.data.Id;
    }

    public get treeId(): string {
        return this.networkId;
    }
}
