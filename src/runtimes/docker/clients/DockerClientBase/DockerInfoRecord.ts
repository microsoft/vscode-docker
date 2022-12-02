/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOS, isContainerOS } from "../../contracts/ContainerClient";

export type DockerInfoRecord = {
    OperatingSystem?: string;
    OSType?: ContainerOS;
};

export function isDockerInfoRecord(maybeInfo: unknown): maybeInfo is DockerInfoRecord {
    const info = maybeInfo as DockerInfoRecord;

    if (typeof info.OSType === 'string' && !isContainerOS(info.OSType)) {
        return false;
    }

    return true;
}
