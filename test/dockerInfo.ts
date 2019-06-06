/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getDockerOSType } from "../extension.bundle";

export async function shouldSkipDockerTest(requires?: { linuxContainers?: boolean }): Promise<boolean> {
    if (!!process.env.DOCKER_UNAVAILABLE) {
        console.warn("Skipping because docker is not available on this system");
        return true;
    }

    if (requires && requires.linuxContainers) {
        const engineType = await getDockerOSType();
        if (engineType !== "linux") {
            console.warn("Skipping because not running Linux containers on this system");
            return true;
        }
    }

    return false;
}
