/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerPlatform } from "../debugging/DockerDebugPlatformHelper";
import { DockerBuildTaskDefinition } from "./DockerBuildTaskProvider";
import { DockerRunTaskDefinition } from "./DockerRunTaskProvider";

export function getTaskPlatform(definition: DockerBuildTaskDefinition | DockerRunTaskDefinition): DockerPlatform | undefined {
    if (definition.platform === 'netCore' || definition.netCore !== undefined) {
        return 'netCore';
    } else if (definition.platform === 'node' || definition.node !== undefined) {
        return 'node';
    } else if (definition.platform === 'python' || definition.python !== undefined) {
        return 'python';
    } else {
        return undefined;
    }
}
