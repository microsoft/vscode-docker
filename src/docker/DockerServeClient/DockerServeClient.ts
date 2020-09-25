/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Containers as ContainersClient } from '@docker/sdk';
import { DeleteRequest, InspectRequest, InspectResponse, ListRequest, ListResponse, StartRequest, StopRequest } from '@docker/sdk/containers';
import { CancellationToken } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { DockerInfo, DockerOSType, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection } from '../Containers';
import { ContextChangeCancelClient } from '../ContextChangeCancelClient';
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

    public constructor() {
        super();
        this.containersClient = new ContainersClient();
    }

    public dispose(): void {
        super.dispose();
        void this.containersClient?.close();
    }

    public async info(context: IActionContext, token?: CancellationToken): Promise<DockerInfo> {
        throw new NotSupportedError(context);
    }

    public async getContainers(context: IActionContext, token?: CancellationToken): Promise<DockerContainer[]> {
        const request = new ListRequest()
            .setAll(true);

        const response: ListResponse = await this.promisify(context, this.containersClient, this.containersClient.list, request, token);
        const result = response.getContainersList();

        return result.map(c => containerToDockerContainer(c.toObject()));
    }

    public async inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection> {
        const request = new InspectRequest()
            .setId(ref);

        const response: InspectResponse = await this.promisify(context, this.containersClient, this.containersClient.inspect, request, token);
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
        const request = new StartRequest()
            .setId(ref);

        await this.promisify(context, this.containersClient, this.containersClient.start, request, token);
    }

    public async restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        await this.stopContainer(context, ref, token);
        await this.startContainer(context, ref, token);
    }

    public async stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new StopRequest()
            .setId(ref);

        await this.promisify(context, this.containersClient, this.containersClient.stop, request, token);
    }

    public async removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new DeleteRequest()
            .setId(ref)
            .setForce(true);

        await this.promisify(context, this.containersClient, this.containersClient.delete, request, token)
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

    public async getVolumes(context: IActionContext, token?: CancellationToken): Promise<DockerVolume[]> {
        throw new NotSupportedError(context);
    }

    public async inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection> {
        throw new NotSupportedError(context);
    }

    public async pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        throw new NotSupportedError(context);
    }

    public async removeVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }
    // #endregion Not supported by the Docker SDK yet

    private async promisify<TRequest, TResponse>(
        context: IActionContext,
        thisArg: unknown,
        clientCallback: (req: TRequest, callback: (err: unknown, response: TResponse) => void) => unknown,
        request: TRequest,
        token?: CancellationToken): Promise<TResponse> {

        const callPromise: Promise<TResponse> = new Promise((resolve, reject) => {
            try {
                clientCallback.call(thisArg, request, (err, response) => {
                    if (err) {
                        reject(err);
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
