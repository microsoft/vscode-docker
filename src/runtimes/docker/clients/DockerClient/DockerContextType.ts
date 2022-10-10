/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContextType } from "../../contracts/ContainerClient";

export type DockerContextType = undefined | 'moby' | 'aci' | 'ecs' | string;

export function normalizeDockerContextType(type: DockerContextType): ContextType {
    switch (type) {
        case undefined:
        case 'moby':
            return 'containerd';
        case 'aci':
        case 'ecs':
        default:
            return type;
    }
}
