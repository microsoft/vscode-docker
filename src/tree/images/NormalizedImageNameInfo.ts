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
     * The part of the image name before the last '/' (if image name is truthy and contains '/'), otherwise 'library' if the
     * normalized registry is 'docker.io', otherwise undefined
     */
    public get normalizedNamespace(): string | undefined {
        let i: number;
        if ((i = this.normalizedImageName.lastIndexOf('/')) >= 0) {
            return this.normalizedImageName.substring(0, i);
        } else if (this.normalizedRegistry === 'docker.io') {
            return 'library';
        } else {
            return undefined;
        }
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
        // If the registry is explicitly or implicitly `docker.io`, and the namespace is explicitly or implicitly `library`,
        // then we don't show either of those parts as the image name--that most closely matches the Docker CLI's default
        // display behavior. As a slight but intentional deviation from that behavior, if an image is namespaced, we'll
        // include the implicit `docker.io`.
        if (this.normalizedRegistry === 'docker.io' && this.normalizedNamespace === 'library') {
            return this.normalizedImageName;
        } else {
            return `${this.normalizedRegistry}/${this.normalizedImageName}`;
        }
    }
}
