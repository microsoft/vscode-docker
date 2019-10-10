/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString } from 'vscode';
import { PlatformOS } from '../utils/platform';
import { TaskDefinitionBase } from './TaskDefinitionBase';

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
    command?: string | ShellQuotedString[];
    containerName?: string;
    entrypoint?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    image?: string;
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    portsPublishAll?: boolean;
    volumes?: DockerContainerVolume[];
}

export interface DockerRunTaskDefinitionBase extends TaskDefinitionBase {
    dockerRun?: DockerRunOptions;
}
