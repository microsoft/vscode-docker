/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerInspectImageRecord = {
    Id: string;
    RepoTags: Array<string>;
    EnvVars: Array<string>,
    Labels: Record<string, string> | null;
    Ports: Record<string, unknown> | null,
    Volumes: Record<string, unknown> | null;
    Entrypoint: Array<string>;
    Command: Array<string>;
    CWD: string | null;
    RepoDigests: Array<string>;
    Architecture: string;
    OperatingSystem: string;
    CreatedAt: string;
    User?: string;
    Raw: object;
};

export function isDockerInspectImageRecord(maybeImage: unknown): maybeImage is DockerInspectImageRecord {
    const image = maybeImage as DockerInspectImageRecord;

    if (!image || typeof image !== 'object') {
        return false;
    }

    if (typeof image.Id !== 'string') {
        return false;
    }

    if (!Array.isArray(image.RepoTags)) {
        return false;
    }

    if (typeof image.Labels !== 'object') {
        return false;
    }

    if (typeof image.Ports !== 'object') {
        return false;
    }

    if (typeof image.Volumes !== 'object') {
        return false;
    }

    if (image.Entrypoint !== null && !Array.isArray(image.Entrypoint)) {
        return false;
    }

    if (image.Command !== null && !Array.isArray(image.Command)) {
        return false;
    }

    if (image.CWD !== null && typeof image.CWD !== 'string') {
        return false;
    }

    if (!Array.isArray(image.RepoDigests)) {
        return false;
    }

    if (typeof image.Architecture !== 'string') {
        return false;
    }

    if (typeof image.OperatingSystem !== 'string') {
        return false;
    }

    if (typeof image.CreatedAt !== 'string') {
        return false;
    }

    if (image.Raw === null || typeof image.Raw !== 'object') {
        return false;
    }

    return true;
}
