/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IContainersClient } from "@microsoft/vscode-container-runtimes";

export class ContainerRuntimeManager {
    private readonly containerRuntimeClients = new Map<string, IContainersClient>();
    private readonly containerRuntimeClientRegisteredEmitter = new vscode.EventEmitter<IContainersClient>();

    public readonly onContainerRuntimeClientRegistered = this.containerRuntimeClientRegisteredEmitter.event;

    public registerContainerRuntimeClient(client: IContainersClient): vscode.Disposable {
        if (!client || !client.id) {
            throw new Error('Invalid client supplied.');
        }

        if (this.containerRuntimeClients.has(client.id)) {
            throw new Error(`A container runtime client with ID '${client.id}' is already registered.`);
        }

        this.containerRuntimeClients.set(client.id, client);

        this.containerRuntimeClientRegisteredEmitter.fire(client);

        return new vscode.Disposable(() => {
            this.containerRuntimeClients.delete(client.id);
        });
    }

    public get runtimeClients(): Array<IContainersClient> {
        return Array.from(this.containerRuntimeClients.values());
    }
}
