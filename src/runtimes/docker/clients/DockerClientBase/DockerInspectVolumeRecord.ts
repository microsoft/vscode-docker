/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerInspectVolumeRecord = {
    Name: string;
    Driver: string;
    Mountpoint: string;
    Scope: string;
    Labels: Record<string, string>;
    Options: Record<string, unknown>;
    CreatedAt: string;
    Raw: string;
};

// TODO: Actually test properties
export function isDockerInspectVolumeRecord(maybeVolume: unknown): maybeVolume is DockerInspectVolumeRecord {
    return true;
}
