/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerComposeClient, IContainerOrchestratorClient } from '@microsoft/container-runtimes';
import { RuntimeManager } from './RuntimeManager';

export class OrchestratorRuntimeManager extends RuntimeManager<IContainerOrchestratorClient> {
    public readonly onOrchestratorRuntimeClientRegistered = this.runtimeClientRegisteredEmitter.event;

    public constructor() {
        super('orchestratorClient');
    }

    // TODO: runtimes: temporarily just return the Docker client, always
    public getClient(): Promise<IContainerOrchestratorClient> {
        return Promise.resolve(this.runtimeClients.find(isDockerComposeClient));
    }
}

export function isDockerComposeClient(maybeComposeClient: IContainerOrchestratorClient): maybeComposeClient is DockerComposeClient {
    return maybeComposeClient.id === DockerComposeClient.ClientId;
}
