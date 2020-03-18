/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image, ImageInfo } from 'dockerode';
import { commands, window } from 'vscode';
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

    public async deleteTreeItemImpl(context: IActionContext): Promise<boolean> {
        const image: Image = this.getImage();
        try {
            // eslint-disable-next-line @typescript-eslint/promise-function-async
            await callDockerodeWithErrorHandling(() => image.remove({ force: true }), context);
        } catch (error) {
            const parsedError: IParsedError = parseError(error);

            // error code 409 is returned for conflicts like the image is used by a running container or another image.
            // Such errors are not really an error, it should be treated as warning.
            if (parsedError.errorType === '409' || parsedError.errorType === 'conflict') {
                const childTags = await this.getChildImageTags();

                if (childTags.length > 0) {
                    const message = localize('vscode-docker.tree.images.dependentImages', 'Image {0} cannot be removed because the following images depend on it and must be removed first: {1}', this.fullTag, childTags.join(','));

                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    window.showWarningMessage(message);
                } else {
                    const message = localize('vscode-docker.tree.images.dependentDanglingImages', 'Image {0} cannot be removed because there are dependent dangling images. Please prune images before removing this image.', this.fullTag);
                    const prune = localize('vscode-docker.tree.images.pruneButton', 'Prune Now');

                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    window.showWarningMessage(message, ...[prune]).then(response => {
                        if (response === prune) {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            commands.executeCommand('vscode-docker.images.prune');
                        }
                    });
                }

                return false;
            } else {
                throw error;
            }
        }

        return true;
    }

    private async getChildImageTags(): Promise<string[]> {
        const childTags = new Set<string>();
        const allImages = await ext.dockerode.listImages({ all: true });

        this.recursiveGetChildImageTags(this.imageId, allImages, childTags);

        return Array.from(childTags.values());
    }

    private recursiveGetChildImageTags(imageId: string, allImages: ImageInfo[], childTags: Set<string>): void {
        const childImages = allImages.filter(i => i.ParentId === imageId);

        for (const childImage of childImages) {
            if (childImage.RepoTags) {
                for (const repoTag of childImage.RepoTags) {
                    if (repoTag !== '<none>:<none>') {
                        childTags.add(repoTag);
                    }
                }
            }

            this.recursiveGetChildImageTags(childImage.Id, allImages, childTags);
        }
    }
}
