/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ImageDesc } from 'dockerode';
import * as moment from 'moment';
import * as vscode from 'vscode';
import { extractRegExGroups } from '../utils/extractRegExGroups';

// If options not specified, retrieves them from user settings
export function getImageLabel(fullTag: string, image: ImageDesc, labelTemplate: string, options?: { truncateLongRegistryPaths: boolean, truncateMaxLength: number }): string {
    let truncatedRepository = truncate(getRepository(fullTag), options);
    let repositoryName = getRepositoryName(fullTag);
    let tag = getTag(fullTag);
    let truncatedFullTag = truncate(fullTag, options);
    let createdSince = getCreatedSince(image.Created || 0);
    let imageId = (image.Id || '').replace('sha256:', '');
    let shortImageId = imageId.slice(0, 12);

    let label = labelTemplate
        .replace('{repository}', truncatedRepository)
        .replace('{repositoryName}', repositoryName)
        .replace('{tag}', tag)
        .replace('{fullTag}', truncatedFullTag)
        .replace('{createdSince}', createdSince)
        .replace('{shortImageId}', shortImageId);
    assert(!label.match(/{|}/), "Unreplaced token");

    return label;
}

export function trimWithElipsis(str: string, max: number = 10): string {
    const elipsis: string = "...";
    const len: number = str.length;

    if (max <= 0 || max >= 100) { return str; }
    if (str.length <= max) { return str; }
    if (max < 3) { return str.substr(0, max); }

    const front: string = str.substr(0, (len / 2) - (-0.5 * (max - len - 3)));
    const back: string = str.substr(len - (len / 2) + (-0.5 * (max - len - 3)));

    return front + elipsis + back;
}

/**
 * Retrieves the full repository name
 * @param fullTag [hostname/][username/]repositoryname[:tag]
 * @returns [hostname/][username/]repositoryname
 */
function getRepository(fullTag: string): string {
    let n = fullTag.lastIndexOf(':');
    return n > 0 ? fullTag.slice(0, n) : fullTag;
}

function truncate(partialTag: string, options: { truncateLongRegistryPaths: boolean, truncateMaxLength: number } | undefined): string {
    // Truncate if user desires
    if (!options) {
        let config = vscode.workspace.getConfiguration('docker');
        let truncateLongRegistryPaths = config.get<boolean>('truncateLongRegistryPaths');
        let truncateMaxLength = config.get<number>('truncateMaxLength');
        options = {
            truncateLongRegistryPaths: typeof truncateLongRegistryPaths === "boolean" ? truncateLongRegistryPaths : false,
            truncateMaxLength: typeof truncateMaxLength === 'number' ? truncateMaxLength : 10
        }
    }

    if (!options.truncateLongRegistryPaths) {
        return partialTag;
    }

    // Extract registry from the rest of the name
    let [registry, restOfName] = extractRegExGroups(partialTag, /^([^\/]+)\/(.*)$/, ['', partialTag]);

    if (registry) {
        let trimmedRegistry = trimWithElipsis(registry, options.truncateMaxLength);
        return `${trimmedRegistry}/${restOfName}`;
    }

    return partialTag;
}

/**
 * Retrieves just the name of the repository
 * @param fullTag [hostname/][username/]repositoryname[:tag]
 * @returns repositoryname
 */
function getRepositoryName(fullTag: string): string {
    return fullTag.replace(/.*\//, "")
        .replace(/:.*/, "");
}

/**
 * Retrieves just the tag (without colon)
 * @param fullTag [hostname/][username/]repositoryname[:tag]
 * @returns tag
 */
function getTag(fullTag: string): string {
    let n = fullTag.lastIndexOf(':');
    return n > 0 ? fullTag.slice(n + 1) : '';
}

function getCreatedSince(created: number): string {
    return moment(new Date(created * 1000)).fromNow();
}
