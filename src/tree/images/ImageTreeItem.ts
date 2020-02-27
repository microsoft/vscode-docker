/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image } from 'dockerode';
import { window } from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, IParsedError, parseError } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { callDockerodeWithErrorHandling } from '../../utils/callDockerodeWithErrorHandling';
import { getThemedIconPath, IconPath } from '../IconPath';
import { ILocalImageInfo } from './LocalImageInfo';

export class ImageTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'image';
    public contextValue: string = ImageTreeItem.contextValue;
    private readonly _item: ILocalImageInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: ILocalImageInfo) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return this._item.treeId;
    }

    public get createdTime(): number {
        return this._item.createdTime;
    }

    public get imageId(): string {
        return this._item.imageId;
    }

    public get fullTag(): string {
        return this._item.fullTag;
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

    public getImage(): Image {
        return ext.dockerode.getImage(this.imageId);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        const image: Image = this.getImage();
        try {
            // eslint-disable-next-line @typescript-eslint/promise-function-async
            await callDockerodeWithErrorHandling(() => image.remove({ force: true }), context);
        } catch (error) {
            const parsedError: IParsedError = parseError(error);

            // error code 409 is returned for conflicts like the image is used by a running container or another image.
            // Such errors are not really an error, it should be treated as warning.
            if (parsedError.errorType === '409') {
                ext.outputChannel.appendLog(localize('vscode-docker.tree.images.warning', 'Warning: {0}', parsedError.message));
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                window.showWarningMessage(parsedError.message);
            } else {
                throw error;
            }
        }
    }
}
