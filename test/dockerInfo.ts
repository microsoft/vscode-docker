/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { docker } from '../extension';
import { EngineInfo } from "dockerode";

let info: EngineInfo | undefined;

export async function isLinuxContainers(): Promise<boolean> {
    let info = await getEngineInfo();
    return info.OSType === 'linux';
}

export async function isWindowsContainers(): Promise<boolean> {
    let info = await getEngineInfo();
    return info.OSType === 'windows';
}

async function getEngineInfo(): Promise<EngineInfo> {
    if (!info) {
        info = await docker.getEngineInfo();
    }

    return info;
}

export async function shouldSkipDockerTest(requires?: { linuxContainers?: boolean }): Promise<boolean> {
    if (!!process.env.DOCKER_UNAVAILABLE) {
        console.warn("Skipping because docker is not available on this system");
        return true;
    }

    if (requires && requires.linuxContainers && !await isLinuxContainers()) {
        console.warn("Skipping because not running Linux containers on this system");
        return true;
    }

    return false;
}
