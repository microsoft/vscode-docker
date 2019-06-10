/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VolumeInspectInfo } from "dockerode";
import * as moment from 'moment';
import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { getThemedIconPath, IconPath } from "../IconPath";

export class VolumeTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'volume';
    public contextValue: string = VolumeTreeItem.contextValue;
    public volume: VolumeInspectInfo;

    public constructor(parent: AzExtParentTreeItem, volume: VolumeInspectInfo) {
        super(parent);
        this.volume = volume;
    }

    public get label(): string {
        return this.volume.Name;
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('volume');
    }

    public get description(): string | undefined {
        return this.createdAt ? moment(new Date(this.createdAt)).fromNow() : undefined;
    }

    public get id(): string {
        return this.volume.Name;
    }

    public get createdAt(): string | undefined {
        // tslint:disable-next-line: no-unsafe-any no-any
        return (<any>this.volume).CreatedAt;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        await ext.dockerode.getVolume(this.volume.Name).remove({ force: true });
    }
}
