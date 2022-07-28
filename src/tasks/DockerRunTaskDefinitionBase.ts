/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PlatformOS } from '../utils/platform';
import { DockerLabels, TaskDefinitionBase } from './TaskDefinitionBase';

export interface DockerContainerExtraHost {
    hostname: string;
    ip: string;
}

export interface DockerContainerPort {
    hostPort?: number;
    containerPort: number;
    protocol?: 'tcp' | 'udp';
}

export interface DockerContainerVolume {
    localPath: string;
    containerPath: string;
    permissions?: 'ro' | 'rw';
}

export interface DockerRunOptions {
    command?: string | string[];
    containerName?: string;
    entrypoint?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    image?: string;
    labels?: DockerLabels;
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    portsPublishAll?: boolean;
    volumes?: DockerContainerVolume[];
    remove?: boolean;
    customOptions?: string;
}

export interface DockerRunTaskDefinitionBase extends TaskDefinitionBase {
    dockerRun?: DockerRunOptions;
}
