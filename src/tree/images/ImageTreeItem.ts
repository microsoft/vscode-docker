/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { DockerImage } from '../../docker/Images';
import { ext } from '../../extensionVariables';
import { getThemedIconPath, IconPath } from '../IconPath';
import { getTreeId } from "../LocalRootTreeItemBase";

export class ImageTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'image';
    public contextValue: string = ImageTreeItem.contextValue;
    private readonly _item: DockerImage;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerImage) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get imageId(): string {
        return this._item.Id;
    }

    public get fullTag(): string {
        return this._item.Name;
    }

    public get label(): string {
        return ext.imagesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.imagesRoot.getTreeItemDescription(this._item);
    }

    public get iconPath(): IconPath {
        let icon: string;
        switch (ext.imagesRoot.labelSetting) {
            case 'Tag':
                icon = 'tag';
                break;
            default:
                icon = 'application';
        }
        return getThemedIconPath(icon);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        let ref = this.fullTag;

        // Dangling images are not shown in the explorer. However, an image can end up with <none> tag, if a new version of that particular tag is pulled.
        if (ref.endsWith(':<none>') && this._item.RepoDigests?.length) {
            // Image is tagged <none>. Need to delete by digest.
            ref = this._item.RepoDigests[0];
        }

        return ext.dockerClient.removeImage(context, ref);
    }
}
