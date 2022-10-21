/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ImageNameInfo } from '../../runtimes/docker';

const noneTag: string = '<none>';

export class NormalizedImageNameInfo {
    public constructor(public readonly imageNameInfo: ImageNameInfo) { }

    /**
     * The image name or '<none>' if the image name is falsy
     */
    public get normalizedImageName(): string {
        return this.imageNameInfo.image || noneTag;
    }

    /**
     * The tag or '<none>' if the tag is falsy
     */
    public get normalizedTag(): string {
        return this.imageNameInfo.tag || noneTag;
    }

    /**
     * The normalized image name + tag (if it is truthy) (NOT the normalized tag)
     */
    public get normalizedImageNameAndTag(): string {
        if (this.imageNameInfo.tag) {
            return `${this.normalizedImageName}:${this.imageNameInfo.tag}`;
        }

        return this.normalizedImageName;
    }

    /**
     * Registry (if it is truthy) + normalized image name and tag
     */
    public get fullTag(): string {
        let fullTag: string = this.normalizedImageNameAndTag;

        if (this.imageNameInfo.registry) {
            fullTag = `${this.imageNameInfo.registry}/${fullTag}`;
        }

        return fullTag;
    }

    /**
     * The part of the image name before the first '/' (if image name is truthy and contains '/'), otherwise 'library' (i.e. the 'library' in 'docker.io/library')
     */
    public get normalizedNamespace(): string {
        let i: number;
        if ((i = this.normalizedImageName.indexOf('/')) >= 0) {
            return this.normalizedImageName.substring(0, i);
        }

        return 'library';
    }

    /**
     * Registry (if it is truthy), otherwise 'docker.io'
     */
    public get normalizedRegistry(): string {
        return this.imageNameInfo.registry || 'docker.io';
    }

    /**
     * Normalized registry + normalized image name
     */
    public get normalizedRegistryAndImageName(): string {
        return `${this.normalizedRegistry}/${this.normalizedImageName}`;
    }
}
