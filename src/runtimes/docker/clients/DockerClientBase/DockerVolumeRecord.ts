/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerVolumeRecord = {
    Name: string;
    Driver: string;
    Labels: string;
    Mountpoint: string;
    Scope: string;
    CreatedAt?: string;
    Size?: string;
};

export function isDockerVolumeRecord(maybeVolume: unknown): maybeVolume is DockerVolumeRecord {
    const volume = maybeVolume as DockerVolumeRecord;

    if (!volume || typeof volume !== 'object') {
        return false;
    }

    if (typeof volume.Name !== 'string') {
        return false;
    }

    if (typeof volume.Driver !== 'string') {
        return false;
    }

    if (typeof volume.Labels !== 'string') {
        return false;
    }

    if (typeof volume.Mountpoint !== 'string') {
        return false;
    }

    if (typeof volume.Scope !== 'string') {
        return false;
    }

    return true;
}
