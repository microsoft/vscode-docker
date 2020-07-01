/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Containers as ContainersClient } from "@docker/sdk";
import { Container, DeleteRequest, InspectRequest, InspectResponse, ListRequest, ListResponse, StopRequest } from "@docker/sdk/dist/containers";
import { CancellationToken } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { localize } from "../../localize";
import { DockerInfo, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection, InspectionPort } from '../Containers';
import { ContextChangeCancelClient } from "../ContextChangeCancelClient";
import { ContextManager } from "../ContextManager";
import { DockerApiClient } from '../DockerApiClient';
import { DockerImage, DockerImageInspection } from '../Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from '../Networks';
import { NotSupportedError } from '../NotSupportedError';
import { DockerVolume, DockerVolumeInspection } from '../Volumes';

// 20 s timeout for all calls (enough time for a possible Dockerode refresh + the call, but short enough to be UX-reasonable)
const dockerServeCallTimeout = 20 * 1000;

export class DockerServeClient extends ContextChangeCancelClient implements DockerApiClient {
    private readonly containersClient: ContainersClient;

    public constructor(contextManager: ContextManager) {
        super(contextManager);
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
        const response: ListResponse = await this.promisify(context, this.containersClient, this.containersClient.list, new ListRequest(), token);
        const result = response.getContainersList();

        return result.map(c => containerToDockerContainer(c.toObject()));
    }

    public async inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection> {
        const request = new InspectRequest();
        request.setId(ref);

        const response: InspectResponse = await this.promisify(context, this.containersClient, this.containersClient.inspect, request, token);
        const container = containerToDockerContainer(response.toObject().container);

        if (!container) {
            throw new Error(localize('vscode-docker.dockerServeClient.noContainer', 'No container with name \'{0}\' was found.', ref));
        }

        return {
            ...container,
            NetworkSettings: {
                Ports: containerPortsToInspectionPorts(container),
            },
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

    public async startContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }

    public async restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        throw new NotSupportedError(context);
    }
    // #endregion Not supported by the Docker SDK yet

    public async stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        // TODO: Stop is on the API but it returns not implemented error
        const request = new StopRequest();
        request.setId(ref);
        request.setTimeout(5000);

        await this.promisify(context, this.containersClient, this.containersClient.stop, request, token);
    }

    public async removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const request = new DeleteRequest();
        request.setId(ref);
        request.setForce(true);

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
        clientCallback: (request: TRequest, callback: (err: unknown, response: TResponse) => void) => unknown,
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

function containerToDockerContainer(container: Container.AsObject): DockerContainer | undefined {
    if (!container) {
        return undefined;
    }

    const ports = container.portsList.map(p => {
        return {
            IP: p.hostIp,
            PublicPort: p.hostPort,
            PrivatePort: p.containerPort,
            Type: p.protocol,
        };
    });

    const labels: { [key: string]: string } = {};
    container.labelsList.forEach(l => {
        const [label, value] = l.split('=');
        labels[label] = value;
    });

    return {
        Id: container.id,
        Image: container.image,
        Name: container.id, // TODO ?
        State: container.status,
        Status: container.status,
        ImageID: undefined, // TODO ?
        CreatedTime: undefined, // TODO ?
        Labels: labels, // TODO--not working
        Ports: ports,
    };
}

function containerPortsToInspectionPorts(container: DockerContainer): { [portAndProtocol: string]: InspectionPort[] } | undefined {
    if (container?.Ports === undefined) {
        return undefined;
    }

    const result: { [portAndProtocol: string]: InspectionPort[] } = {};

    for (const port of container.Ports) {
        // Get the key
        const key = `${port.PrivatePort}/${port.Type}`;

        // If there's no entries for this key yet, create an empty list
        if (result[key] === undefined) {
            result[key] = [];
        }

        // Add the value to the list
        result[key].push({
            HostIp: port.IP,
            HostPort: port.PublicPort.toString(),
        });
    }

    return result;
}
