/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VolumeInspectInfo } from "dockerode";
import { ILocalItem } from "../LocalRootTreeItemBase";

/**
 * Wrapper class for Dockerode item, which has inconsistent names/types
 */
export class LocalVolumeInfo implements ILocalItem {
    public data: VolumeInspectInfo;
    public constructor(data: VolumeInspectInfo) {
        this.data = data;
    }

    public get createdTime(): number {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        return new Date((<any>this.data).CreatedAt).valueOf();
    }

    public get volumeName(): string {
        return this.data.Name;
    }

    public get treeId(): string {
        return this.volumeName;
    }
}
