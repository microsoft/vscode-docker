/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CancellationToken, Event } from 'vscode';
import { ext } from '../../extensionVariables';
import { DockerInfo, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection } from '../Containers';
import { DockerApiClient, DockerExecCommandProvider, DockerExecOptions } from '../DockerApiClient';
import { DockerImage, DockerImageInspection } from '../Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from '../Networks';
import { DockerVersion } from '../Version';
import { DockerVolume, DockerVolumeInspection } from '../Volumes';

/**
 * This client does not actually do anything, but instead, allows callers to transparently await a call on
 * ext.dockerClient without needing to worry about the initial load time
 */
export class ContextLoadingClient implements DockerApiClient {
    private readonly contextLoadingPromise: Promise<void>;

    public constructor(onFinishedLoading: Event<unknown | undefined>) {
        this.contextLoadingPromise = new Promise((resolve, reject) => {
            const disposable = onFinishedLoading((error?: unknown) => {
                disposable.dispose();

                if (error) {
                    return reject(error);
                }

                resolve();
            });
        });
    }

    public dispose(): void {
        // Do nothing
    }

    public async info(context: IActionContext, token?: CancellationToken): Promise<DockerInfo> {
        await this.contextLoadingPromise;
        return ext.dockerClient.info(context, token);
    }

    public async version(context: IActionContext, token?: CancellationToken): Promise<DockerVersion> {
        await this.contextLoadingPromise;
        return ext.dockerClient.version(context, token);
    }

    public async getContainers(context: IActionContext, token?: CancellationToken): Promise<DockerContainer[]> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getContainers(context, token);
    }

    public async inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection> {
        await this.contextLoadingPromise;
        return ext.dockerClient.inspectContainer(context, ref, token);
    }

    public async execInContainer(context: IActionContext, ref: string, command: string[] | DockerExecCommandProvider, options?: DockerExecOptions, token?: CancellationToken): Promise<{ stdout: string, stderr: string }> {
        await this.contextLoadingPromise;
        return ext.dockerClient.execInContainer(context, ref, command, options, token);
    }

    public async getContainerFile(context: IActionContext, ref: string, path: string, token?: CancellationToken): Promise<Buffer> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getContainerFile(context, ref, path, token);
    }

    public async putContainerFile(context: IActionContext, ref: string, path: string, content: Buffer, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.putContainerFile(context, ref, path, content, token);
    }

    public async getContainerLogs(context: IActionContext, ref: string, token?: CancellationToken): Promise<NodeJS.ReadableStream> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getContainerLogs(context, ref, token);
    }

    public async pruneContainers(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        await this.contextLoadingPromise;
        return ext.dockerClient.pruneContainers(context, token);
    }

    public async startContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.startContainer(context, ref, token);
    }

    public async restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.restartContainer(context, ref, token);
    }

    public async stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.stopContainer(context, ref, token);
    }

    public async removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.removeContainer(context, ref, token);
    }

    public async getImages(context: IActionContext, includeDangling?: boolean, token?: CancellationToken): Promise<DockerImage[]> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getImages(context, includeDangling, token);
    }

    public async inspectImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerImageInspection> {
        await this.contextLoadingPromise;
        return ext.dockerClient.inspectImage(context, ref, token);
    }

    public async pruneImages(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        await this.contextLoadingPromise;
        return ext.dockerClient.pruneImages(context, token);
    }

    public async tagImage(context: IActionContext, ref: string, tag: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.tagImage(context, ref, tag, token);
    }

    public async removeImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.removeImage(context, ref, token);
    }

    public async getNetworks(context: IActionContext, token?: CancellationToken): Promise<DockerNetwork[]> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getNetworks(context, token);
    }

    public async inspectNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerNetworkInspection> {
        await this.contextLoadingPromise;
        return ext.dockerClient.inspectNetwork(context, ref, token);
    }

    public async pruneNetworks(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        await this.contextLoadingPromise;
        return ext.dockerClient.pruneNetworks(context, token);
    }

    public async createNetwork(context: IActionContext, options: { Name: string; Driver: DriverType; }, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.createNetwork(context, options, token);
    }

    public async removeNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.removeNetwork(context, ref, token);
    }

    public async getVolumes(context: IActionContext, token?: CancellationToken): Promise<DockerVolume[]> {
        await this.contextLoadingPromise;
        return ext.dockerClient.getVolumes(context, token);
    }

    public async inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection> {
        await this.contextLoadingPromise;
        return ext.dockerClient.inspectVolume(context, ref, token);
    }

    public async pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        await this.contextLoadingPromise;
        return ext.dockerClient.pruneVolumes(context, token);
    }

    public async removeVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.contextLoadingPromise;
        return ext.dockerClient.removeVolume(context, ref, token);
    }
}
