/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CancellationToken, Disposable } from 'vscode';
import { DockerInfo, DockerOSType, PruneResult } from './Common';
import { DockerContainer, DockerContainerInspection } from './Containers';
import { DockerImage, DockerImageInspection } from './Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from './Networks';
import { DockerVersion } from './Version';
import { DockerVolume, DockerVolumeInspection } from './Volumes';

export type DockerExecOptions = {
    user?: string;
};

export type DockerExecCommandProvider = (shell: DockerOSType) => string[];

export interface DockerApiClient extends Disposable {
    info(context: IActionContext, token?: CancellationToken): Promise<DockerInfo>;
    version(context: IActionContext, token?: CancellationToken): Promise<DockerVersion>;

    getContainers(context: IActionContext, token?: CancellationToken): Promise<DockerContainer[]>;
    inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection>;
    execInContainer(context: IActionContext, ref: string, command: string[] | DockerExecCommandProvider, options?: DockerExecOptions, token?: CancellationToken): Promise<{ stdout: string, stderr: string }>;
    getContainerFile(context: IActionContext, ref: string, path: string, token?: CancellationToken): Promise<Buffer>;
    putContainerFile(context: IActionContext, ref: string, path: string, content: Buffer, token?: CancellationToken): Promise<void>;
    getContainerLogs(context: IActionContext, ref: string, token?: CancellationToken): Promise<NodeJS.ReadableStream>;
    pruneContainers(context: IActionContext, token?: CancellationToken): Promise<PruneResult | undefined>;
    startContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;
    restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;
    stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;
    removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;

    getImages(context: IActionContext, includeDangling: boolean, token?: CancellationToken): Promise<DockerImage[]>;
    inspectImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerImageInspection>;
    pruneImages(context: IActionContext, token?: CancellationToken): Promise<PruneResult | undefined>;
    tagImage(context: IActionContext, ref: string, tag: string, token?: CancellationToken): Promise<void>;
    removeImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;

    getNetworks(context: IActionContext, token?: CancellationToken): Promise<DockerNetwork[]>;
    inspectNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerNetworkInspection>;
    pruneNetworks(context: IActionContext, token?: CancellationToken): Promise<PruneResult | undefined>;
    createNetwork(context: IActionContext, options: { Name: string, Driver: DriverType }, token?: CancellationToken): Promise<void>;
    removeNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;

    getVolumes(context: IActionContext, token?: CancellationToken): Promise<DockerVolume[]>;
    inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection>;
    pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult | undefined>;
    removeVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<void>;
}
