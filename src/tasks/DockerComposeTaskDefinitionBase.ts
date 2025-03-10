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
        profiles?: string[];
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
        profiles?: string[];
    };
}

export interface DockerComposeUpAndDownOptions {
    envFile?: string;

    /**
     * @deprecated Use `envFile` instead
     */
    envFiles?: string[];

    files?: string[];

    projectName?: string;
}

export type DockerComposeOptions = (DockerComposeUpOptions | DockerComposeDownOptions) & DockerComposeUpAndDownOptions;

export interface DockerComposeTaskDefinitionBase extends TaskDefinitionBase {
    dockerCompose?: DockerComposeOptions;
}
