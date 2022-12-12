/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectVolumesItem } from '../../contracts/ContainerClient';
import { dayjs } from '../../utils/dayjs';

export type DockerInspectVolumeRecord = {
    Name: string;
    Driver: string;
    Mountpoint: string;
    Scope: string;
    Labels: Record<string, string>;
    Options: Record<string, unknown>;
    CreatedAt: string;
};

// TODO: Actually test properties
export function isDockerInspectVolumeRecord(maybeVolume: unknown): maybeVolume is DockerInspectVolumeRecord {
    return true;
}

export function normalizeDockerInspectVolumeRecord(volume: DockerInspectVolumeRecord): InspectVolumesItem {
    const createdAt = dayjs.utc(volume.CreatedAt);

    // Return the normalized InspectVolumesItem record
    return {
        name: volume.Name,
        driver: volume.Driver,
        mountpoint: volume.Mountpoint,
        scope: volume.Scope,
        labels: volume.Labels,
        options: volume.Options,
        createdAt: createdAt.toDate(),
        raw: JSON.stringify(volume),
    };
}
