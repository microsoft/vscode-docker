/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Image, ImageInfo } from 'dockerode';
import { commands, window } from 'vscode';
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, IParsedError, parseError, UserCancelledError } from "vscode-azureextensionui";
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
            if (parsedError.errorType === '409' || parsedError.errorType === 'conflict') {
                await this.handleImageDeleteConflict(context);

                // Throw a UserCancelledError instead since this isn't a real error
                throw new UserCancelledError();
            } else {
                throw error;
            }
        }
    }

    private async handleImageDeleteConflict(context: IActionContext): Promise<void> {
        const childTags = await this.getChildImageTags();

        if (childTags.length > 0) {
            const message = localize('vscode-docker.tree.images.dependentImages', 'Image {0} cannot be removed because the following images depend on it and must be removed first: {1}', this.fullTag, childTags.join(', '));
            const removeChildren = localize('vscode-docker.tree.images.removeDependentImages', 'Remove Dependent Images');

            const allImageNodes = await ext.imagesRoot.getFlattenedCachedChildren(context);

            // Since childTags comes as depth-first search, deleting in this specific order should work, as we'll be targeting leaf nodes first
            const dependentImageNodes: ImageTreeItem[] = childTags.map(childFullTag => {
                return allImageNodes.find(n => n instanceof ImageTreeItem && n.fullTag === childFullTag) as ImageTreeItem
            });

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            window.showWarningMessage(message, ...[removeChildren]).then(response => {
                if (response === removeChildren) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    commands.executeCommand('vscode-docker.images.remove', dependentImageNodes[0], dependentImageNodes);
                }
            });
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
    }

    private async getChildImageTags(): Promise<string[]> {
        const allImages = await ext.dockerode.listImages({ all: true });

        return recursiveGetChildImageTags(this.imageId, allImages);
    }
}

function recursiveGetChildImageTags(imageId: string, allImages: ImageInfo[]): string[] {
    const childImages = allImages.filter(i => i.ParentId === imageId);
    const results: string[] = [];

    for (const childImage of childImages) {
        // Depth-first search
        recursiveGetChildImageTags(childImage.Id, allImages).forEach(t => results.push(t));

        if (childImage.RepoTags) {
            for (const repoTag of childImage.RepoTags) {
                if (repoTag !== '<none>:<none>') {
                    results.push(repoTag);
                }
            }
        }
    }

    return results;
}
