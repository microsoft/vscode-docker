/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TaskDefinitionBase } from './TaskDefinitionBase';

export interface DockerComposeUpOptions {
    up?: {
        detached?: boolean;
        build?: boolean;
        scale?: { [service: string]: number };
        services?: string[];
        customOptions?: string;
    };
    down?: never;
}

export interface DockerComposeDownOptions {
    up?: never;
    down?: {
        removeImages?: 'all' | 'local';
        removeVolumes?: boolean;
        customOptions?: string;
    };
}

export type DockerComposeOptions = (DockerComposeUpOptions | DockerComposeDownOptions) & { envFiles?: string[], files?: string[] };

export interface DockerComposeTaskDefinitionBase extends TaskDefinitionBase {
    dockerCompose?: DockerComposeOptions;
}
