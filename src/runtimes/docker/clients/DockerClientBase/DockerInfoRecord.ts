/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOS, DockerClientInfo, isContainerOS } from "../../contracts/ContainerClient";

export type DockerInfoRecord = {
    OperatingSystem?: string;
    OSType?: ContainerOS;
    ClientInfo?: DockerClientInfo;
};
export function isDockerInfoRecord(maybeInfo: unknown): maybeInfo is DockerInfoRecord {

    const info = maybeInfo as DockerInfoRecord;

    if (typeof info.OSType === 'string' && !isContainerOS(info.OSType)) {
        return false;
    }

    if (info.ClientInfo && typeof info.ClientInfo !== 'object') {
        return false;
    }

    return true;
}
