/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Containers as ContainersClient, Volumes as VolumesClient } from '@docker/sdk';
import * as Containers from '@docker/sdk/containers';
import * as Volumes from '@docker/sdk/volumes';
import { Client as GrpcClient, Metadata } from '@grpc/grpc-js';
import { CancellationToken } from 'vscode';
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { DockerInfo, DockerOSType, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection } from '../Containers';
import { ContextChangeCancelClient } from '../ContextChangeCancelClient';
import { DockerContext } from '../Contexts';
import { DockerApiClient } from '../DockerApiClient';
import { DockerImage, DockerImageInspection } from '../Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from '../Networks';
import { NotSupportedError } from '../NotSupportedError';
import { DockerVolume, DockerVolumeInspection } from '../Volumes';
import { containerPortsToInspectionPorts, containerToDockerContainer } from './DockerServeUtils';

// 20 s timeout for all calls (enough time for any call, but short enough to be UX-reasonable)
const dockerServeCallTimeout = 20 * 1000;

export class DockerServeClient extends ContextChangeCancelClient implements DockerApiClient {
    private readonly containersClient: ContainersClient;
    private readonly volumesClient: VolumesClient;
    private readonly callMetadata: Metadata;

    public constructor(currentContext: DockerContext) {
        super();

        this.containersClient = new ContainersClient();
        this.volumesClient = new VolumesClient();

        this.callMetadata = new Metadata();
        this.callMetadata.add('context_key', currentContext.Name);
    }

    public dispose(): void {
        super.dispose();
        void this.containersClient?.close();
    }

    public async info(context: IActionContext, token?: CancellationToken): Promise<DockerInfo> {
        throw new NotSupportedError(context);
    }

    public async getContainers(context: IActionContext, token?: CancellationToken): Promise<DockerContainer[]> {
        const request = new Containers.ListRequest()
            .setAll(true);

        const response: Containers.ListResponse = await this.promisify(context, this.containersClient, this.containersClient.list, request, token);
        const result = response.getContainersList();

        return result.map(c => containerToDockerContainer(c.toObject()));
    }

    public async inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection> {
        const request = new Containers.InspectRequest()
            .setId(ref);

        const response: Containers.InspectResponse = await this.promisify(context, this.containersClient, this.containersClient.inspect, request, token);
        const responseContainer = response.toObject().container;

        const container = containerToDockerContainer(responseContainer);

        if (!container) {
            throw new Error(localize('vscode-docker.dockerServeClient.noContainer', 'No container with name \'{0}\' was found.', ref));
        }

        return {
            ...container,
            NetworkSettings: {
                Ports: containerPortsToInspectionPorts(container),
            },
            Platform: responseContainer.platform as DockerOSType,
        };
    }

    // #region Not supported by the Docker SDK yet
    public async getContainerLogs(context: IActionContext, ref: string, token?: CancellationToken): Promise<NodeJS.ReadableStream> {
        // Supported by SDK, but used only for debugging which will not work in ACI, and complicated to implement
        throw new NotSupportedError(context);
    }

    public async pruneContainers(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        throw new NotSupportedError(context);
    }
    // #endregion Not supported by the Docker SDK yet

    public async startContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new Containers.StartRequest()
            .setId(ref);

        await this.promisify(context, this.containersClient, this.containersClient.start, request, token);
    }

    public async restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.stopContainer(context, ref, token);
        await this.startContainer(context, ref, token);
    }

    public async stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new Containers.StopRequest()
            .setId(ref);

        await this.promisify(context, this.containersClient, this.containersClient.stop, request, token);
    }

    public async removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new Containers.DeleteRequest()
            .setId(ref)
            .setForce(true);

        await this.promisify(context, this.containersClient, this.containersClient.delete, request, token);
    }

    // #region Not supported by the Docker SDK yet
    public async getImages(context: IActionContext, token?: CancellationToken): Promise<DockerImage[]> {
        throw new NotSupportedError(context);
    }

    public async inspectImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerImageInspection> {
        throw new NotSupportedError(context);
    }

    public async pruneImages(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        throw new NotSupportedError(context);
    }

    public async tagImage(context: IActionContext, ref: string, tag: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }

    public async removeImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }

    public async getNetworks(context: IActionContext, token?: CancellationToken): Promise<DockerNetwork[]> {
        throw new NotSupportedError(context);
    }

    public async inspectNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerNetworkInspection> {
        throw new NotSupportedError(context);
    }

    public async pruneNetworks(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        throw new NotSupportedError(context);
    }

    public async createNetwork(context: IActionContext, options: { Name: string; Driver: DriverType; }, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }

    public async removeNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }
    // #endregion Not supported by the Docker SDK yet

    public async getVolumes(context: IActionContext, token?: CancellationToken): Promise<DockerVolume[]> {
        const response: Volumes.VolumesListResponse = await this.promisify(context, this.volumesClient, this.volumesClient.volumesList, new Volumes.VolumesListRequest(), token);
        const result = response.getVolumesList();

        return result.map(v => v.toObject()).map(v => {
            return {
                Name: v.id,
                Description: v.description,
                Id: undefined,
                CreatedTime: undefined,
            };
        });

    }

    // #region Not supported by the Docker SDK yet
    public async inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection> {
        throw new NotSupportedError(context);
    }

    public async pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        throw new NotSupportedError(context);
    }
    // #endregion Not supported by the Docker SDK yet

    public async removeVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new Volumes.VolumesDeleteRequest()
            .setId(ref);

        await this.promisify(context, this.volumesClient, this.volumesClient.volumesDelete, request, token);
    }

    private async promisify<TRequest, TResponse>(
        context: IActionContext,
        client: GrpcClient,
        clientCallback: (req: TRequest, md: Metadata, callback: (err: unknown, response: TResponse) => void) => unknown,
        request: TRequest,
        token?: CancellationToken): Promise<TResponse> {

        const callPromise: Promise<TResponse> = new Promise((resolve, reject) => {
            try {
                clientCallback.call(client, request, this.callMetadata, (err, response) => {
                    if (err) {
                        const error = parseError(err);

                        if (error.errorType === '12') {
                            // Rewrap NotImplemented (12) as NotSupportedError
                            reject(new NotSupportedError(context));
                        } else {
                            reject(err);
                        }
                    }

                    resolve(response);
                });
            } catch (err) {
                reject(err);
            }
        });

        return this.withTimeoutAndCancellations(context, async () => callPromise, dockerServeCallTimeout, token);
    }
}
