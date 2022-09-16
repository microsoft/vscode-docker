/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { /* DockerExtensionExport, */ IContainerOrchestratorClient, IContainersClient } from '@microsoft/container-runtimes';
import { ContainerRuntimeManager } from './runtimes/ContainerRuntimeManager';
import { OrchestratorRuntimeManager } from './runtimes/OrchestratorRuntimeManager';

export class DockerExtensionApi implements MementoExplorerExport /*, DockerExtensionExport */ {
    readonly #extensionMementos: ExtensionMementos | undefined;
    readonly #containerRuntimeManager: ContainerRuntimeManager;
    readonly #orchestratorRuntimeManager: OrchestratorRuntimeManager;

    public constructor(ctx: vscode.ExtensionContext, runtimeManager: ContainerRuntimeManager, orchestratorRuntimeManager: OrchestratorRuntimeManager) {
        // If the magic VSCODE_DOCKER_TEAM environment variable is set to 1, export the mementos for use by the Memento Explorer extension
        if (process.env.VSCODE_DOCKER_TEAM === '1') {
            this.#extensionMementos = {
                globalState: ctx.globalState,
                workspaceState: ctx.workspaceState,
            };
        }

        this.#containerRuntimeManager = runtimeManager;
        this.#orchestratorRuntimeManager = orchestratorRuntimeManager;
    }

    public get memento(): ExtensionMementos | undefined {
        return this.#extensionMementos;
    }

    public registerContainerRuntimeClient(client: IContainersClient): vscode.Disposable {
        return this.#containerRuntimeManager.registerRuntimeClient(client);
    }

    public registerContainerOrchestratorClient(client: IContainerOrchestratorClient): vscode.Disposable {
        return this.#orchestratorRuntimeManager.registerRuntimeClient(client);
    }
}

interface MementoExplorerExport {
    readonly memento?: ExtensionMementos;
}

interface ExtensionMementos {
    readonly globalState: vscode.Memento;
    readonly workspaceState: vscode.Memento;
}
