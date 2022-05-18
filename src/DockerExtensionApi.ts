/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DockerExtensionExport, IContainersClient } from '@microsoft/vscode-container-runtimes';
import { RuntimeManager } from './runtimes/RuntimeManager';

export class DockerExtensionApi implements MementoExplorerExport, DockerExtensionExport {
    readonly #extensionMementos: ExtensionMementos | undefined;

    public constructor(ctx: vscode.ExtensionContext, private readonly runtimeManager: RuntimeManager) {
        // If the magic VSCODE_DOCKER_TEAM environment variable is set to 1, export the mementos for use by the Memento Explorer extension
        if (process.env.VSCODE_DOCKER_TEAM === '1') {
            this.#extensionMementos = {
                globalState: ctx.globalState,
                workspaceState: ctx.workspaceState,
            };
        }
    }

    public get memento(): ExtensionMementos | undefined {
        return this.#extensionMementos;
    }

    public registerContainerRuntimeClient(client: IContainersClient): vscode.Disposable {
        if (!client) {
            throw new Error('Invalid client supplied.');
        }

        return this.runtimeManager.registerContainerRuntimeClient(client);
    }
}

interface MementoExplorerExport {
    readonly memento?: ExtensionMementos;
}

interface ExtensionMementos {
    readonly globalState: vscode.Memento;
    readonly workspaceState: vscode.Memento;
}
