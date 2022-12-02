/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListImagesItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from './parseDockerLikeImageName';
import { tryParseSize } from './tryParseSize';

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

export function normalizeDockerListImageRecord(image: DockerListImageRecord): ListImagesItem {
    const createdAt = dayjs.utc(image.CreatedAt).toDate();
    const size = tryParseSize(image.Size);

    const repositoryAndTag = `${image.Repository}${image.Tag ? `:${image.Tag}` : ''}`;

    return {
        id: image.ID,
        image: parseDockerLikeImageName(repositoryAndTag),
        // labels: {}, // TODO: image labels are conspicuously absent from Docker image listing output
        createdAt,
        size,
    };
}
