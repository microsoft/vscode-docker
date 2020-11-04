/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TaskDefinitionBase } from './TaskDefinitionBase';

export interface DockerComposeUpOptions {
    detached?: boolean;
    build?: boolean;
    scale?: { [service: string]: number };
    services?: string[];
    customOptions?: string;
}

export interface DockerComposeDownOptions {
    removeImages?: 'all' | 'local';
    removeVolumes?: boolean;
    customOptions?: string;
}

export interface DockerComposeOptions {
    up?: DockerComposeUpOptions;
    down?: DockerComposeDownOptions;
    files?: string[];
}

export interface DockerComposeTaskDefinitionBase extends TaskDefinitionBase {
    dockerCompose?: DockerComposeOptions;
}
