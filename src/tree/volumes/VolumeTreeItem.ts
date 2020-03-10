/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Volume } from "dockerode";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { callDockerode, callDockerodeWithErrorHandling } from "../../utils/callDockerode";
import { getThemedIconPath, IconPath } from "../IconPath";
import { LocalVolumeInfo } from "./LocalVolumeInfo";

export class VolumeTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'volume';
    public contextValue: string = VolumeTreeItem.contextValue;
    private readonly _item: LocalVolumeInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: LocalVolumeInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get volumeName(): string {
        return this._item.volumeName;
    }

    public get label(): string {
        return ext.volumesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.volumesRoot.getTreeItemDescription(this._item);
    }

    public get iconPath(): IconPath {
        return getThemedIconPath('volume');
    }

    public async getVolume(): Promise<Volume> {
        return callDockerode(() => ext.dockerode.getVolume(this.volumeName));
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        const volume: Volume = await this.getVolume();
        await callDockerodeWithErrorHandling(async () => volume.remove({ force: true }), context);
    }
}
