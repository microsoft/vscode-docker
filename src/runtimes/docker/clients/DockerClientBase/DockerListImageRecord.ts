/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerListImageRecord = {
    ID: string;
    Repository: string;
    Tag: string;
    CreatedAt: string;
    Size: string | number;
};

export function isDockerListImageRecord(maybeImage: unknown): maybeImage is DockerListImageRecord {
    const image = maybeImage as DockerListImageRecord;

    if (!image || typeof image !== 'object') {
        return false;
    }

    if (typeof image.ID !== 'string') {
        return false;
    }

    if (typeof image.Repository !== 'string') {
        return false;
    }

    if (typeof image.Tag !== 'string') {
        return false;
    }

    if (typeof image.CreatedAt !== 'string') {
        return false;
    }

    if (typeof image.Size !== 'string' && typeof image.Size !== 'number') {
        return false;
    }

    return true;
}
