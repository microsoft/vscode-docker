/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IContainersClient } from "@microsoft/vscode-container-runtimes";

export class RuntimeManager {
    readonly #containerRuntimeClients = new Map<string, IContainersClient>();

    public registerContainerRuntimeClient(client: IContainersClient): vscode.Disposable {
        if (this.#containerRuntimeClients.has(client.id)) {
            throw new Error(`A container runtime client with ID '${client.id}' is already registered.`);
        }

        this.#containerRuntimeClients.set(client.id, client);

        return new vscode.Disposable(() => {
            this.#containerRuntimeClients.delete(client.id);
        });
    }

    public get runtimeClients(): Array<IContainersClient> {
        return Array.from(this.#containerRuntimeClients.values());
    }
}

const instance = new RuntimeManager();
export default instance;
