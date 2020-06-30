/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExecOptions } from 'child_process';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { URL } from 'url';
import { Event, EventEmitter, workspace } from 'vscode';
import { Disposable } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { LineSplitter } from '../debugging/coreclr/lineSplitter';
import { ext } from '../extensionVariables';
import { AsyncLazy } from '../utils/lazy';
import { execAsync, spawnAsync } from '../utils/spawnAsync';
import { DockerContext, DockerContextInspection } from './Contexts';
import { DockerodeApiClient } from './DockerodeApiClient/DockerodeApiClient';
import { DockerServeClient } from './DockerServeClient/DockerServeClient';

// CONSIDER
// Any of the commands related to Docker context can take a very long time to execute (a minute or longer)
// if the current context refers to a remote Docker engine that is unreachable (e.g. machine is shut down).
// Consider having our own timeout for execution of any context-related Docker CLI commands.
// The following timeout is for _starting_ the command only; in the current implementation there is no timeot
// for command duration.
const ContextCmdExecOptions: ExecOptions = { timeout: 5000 }

const dockerConfigFile = path.join(os.homedir(), '.docker', 'config.json');
const dockerContextsFolder = path.join(os.homedir(), '.docker', 'contexts', 'meta');

const WindowsLocalPipe = 'npipe:////./pipe/docker_engine';
const UnixLocalPipe = 'unix:///var/run/docker.sock';

const defaultContext: Partial<DockerContext> = {
    Name: 'default',
    Description: 'Current DOCKER_HOST based configuration',
    CreatedTime: undefined, // Not defined for contexts
};

export interface ContextManager {
    readonly onContextChanged: Event<DockerContext>;
    refresh(): Promise<void>;
    getContexts(): Promise<DockerContext[]>;

    inspect(actionContext: IActionContext, contextName: string): Promise<DockerContextInspection>;
    use(actionContext: IActionContext, contextName: string): Promise<void>;
    remove(actionContext: IActionContext, contextName: string): Promise<void>;
}

// TODO: consider a periodic refresh as a catch-all; but make sure it compares old data to new before firing a change event
// TODO: so that non-changes don't result in everything getting refreshed
export class DockerContextManager implements ContextManager, Disposable {
    private readonly emitter: EventEmitter<DockerContext> = new EventEmitter<DockerContext>();
    private readonly contextsCache: AsyncLazy<DockerContext[]>;
    private readonly configFileWatcher: fs.FSWatcher;
    private readonly contextFolderWatcher: fs.FSWatcher;
    private refreshing: boolean = false;

    public constructor() {
        this.contextsCache = new AsyncLazy(async () => this.loadContexts());

        /* eslint-disable @typescript-eslint/tslint/config */
        this.configFileWatcher = fs.watch(dockerConfigFile, async () => this.refresh());
        this.contextFolderWatcher = fs.watch(dockerContextsFolder, async () => this.refresh());
        /* eslint-enable @typescript-eslint/tslint/config */
    }

    public dispose(): void {
        void this.configFileWatcher?.close();
        void this.contextFolderWatcher?.close();
        void ext.dockerClient?.dispose();
    }

    public get onContextChanged(): Event<DockerContext> {
        return this.emitter.event;
    }

    public async refresh(): Promise<void> {
        if (this.refreshing) {
            return;
        }

        try {
            this.refreshing = true;

            this.contextsCache.clear();
            const contexts = await this.contextsCache.getValue();
            const currentContext = contexts.find(c => c.Current);

            if (currentContext.DockerEndpoint === '') { // TODO: check based on type
                if (ext.dockerClient instanceof DockerodeApiClient || ext.dockerClient === undefined) {
                    // Need to switch modes to the new SDK client
                    void ext.dockerClient?.dispose();
                    ext.dockerClient = new DockerServeClient(this);
                }
            } else {
                if (ext.dockerClient instanceof DockerServeClient || ext.dockerClient === undefined) {
                    // Need to switch modes to the Dockerode client
                    void ext.dockerClient?.dispose();
                    ext.dockerClient = new DockerodeApiClient(this);
                }
            }

            this.emitter.fire(currentContext);
        } finally {
            this.refreshing = false;
        }
    }

    public async getContexts(): Promise<DockerContext[]> {
        return this.contextsCache.getValue();
    }

    public async inspect(actionContext: IActionContext, contextName: string): Promise<DockerContextInspection> {
        const { stdout } = await execAsync(`docker context inspect ${contextName}`, { timeout: 10000 });

        // The result is an array with one entry
        const result: DockerContextInspection[] = JSON.parse(stdout) as DockerContextInspection[];
        return result[0];
    }

    public async use(actionContext: IActionContext, contextName: string): Promise<void> {
        const useCmd: string = `docker context use ${contextName}`;
        await execAsync(useCmd, ContextCmdExecOptions);
    }

    public async remove(actionContext: IActionContext, contextName: string): Promise<void> {
        const removeCmd: string = `docker context rm ${contextName}`;
        await spawnAsync(removeCmd, ContextCmdExecOptions);
    }

    private async loadContexts(): Promise<DockerContext[]> {
        return callWithTelemetryAndErrorHandling(ext.dockerClient ? 'docker-context.change' : 'docker-context.initialize', async (actionContext: IActionContext) => {
            try {
                // docker-context.initialize and docker-context.change should be treated as "activation events", in that they aren't real user action
                actionContext.telemetry.properties.isActivationEvent = 'true';

                ext.treeInitError = undefined;

                let dockerHost: string | undefined;
                const config = workspace.getConfiguration('docker');
                if ((dockerHost = config.get('host'))) { // Assignment + check is intentional
                    actionContext.telemetry.properties.hostSource = 'docker.host';
                } else if ((dockerHost = process.env.DOCKER_HOST)) { // Assignment + check is intentional
                    actionContext.telemetry.properties.hostSource = 'env';
                } else if (!(await fse.pathExists(dockerContextsFolder)) || (await fse.readdir(dockerContextsFolder)).length === 0) {
                    // If there's nothing inside ~/.docker/contexts/meta, then there's only the default, unmodifiable DOCKER_HOST-based context
                    // It is unnecessary to call `docker context inspect`
                    actionContext.telemetry.properties.hostSource = 'defaultContextOnly';
                    dockerHost = os.platform() === 'win32' ? WindowsLocalPipe : UnixLocalPipe;
                } else {
                    dockerHost = undefined;
                }

                if (dockerHost !== undefined) {
                    actionContext.telemetry.properties.hostProtocol = new URL(dockerHost).protocol;

                    return [{
                        ...defaultContext,
                        Current: true,
                        DockerEndpoint: dockerHost,
                    } as DockerContext];
                }

                // No value for DOCKER_HOST, and multiple contexts exist, so check them
                const result: DockerContext[] = [];
                const { stdout } = await execAsync('docker context ls --format="{{json .}}"', { timeout: 10000 });
                const lines = LineSplitter.splitLines(stdout);

                for (const line of lines) {
                    result.push(JSON.parse(line) as DockerContext);
                }

                const currentContext = result.find(c => c.Current);

                if (currentContext.Name === 'default') {
                    actionContext.telemetry.properties.hostSource = 'defaultContextSelected';
                } else {
                    actionContext.telemetry.properties.hostSource = 'customContextSelected'
                }

                try {
                    actionContext.telemetry.properties.hostProtocol = new URL(currentContext.DockerEndpoint).protocol;
                } catch {
                    actionContext.telemetry.properties.hostProtocol = 'unknown';
                }

                return result;
            } catch (err) {
                ext.treeInitError = err;
                actionContext.errorHandling.suppressDisplay = true;

                // Rethrow the error to the telemetry handler
                throw err;
            }
        });
    }
}
