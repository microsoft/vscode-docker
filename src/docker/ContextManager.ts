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
import { commands, Event, EventEmitter, workspace } from 'vscode';
import { Disposable } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { AsyncLazy } from '../utils/lazy';
import { isWindows } from '../utils/osUtils';
import { execAsync, spawnAsync } from '../utils/spawnAsync';
import { DockerContext, DockerContextInspection, isNewContextType } from './Contexts';
import { DockerodeApiClient } from './DockerodeApiClient/DockerodeApiClient';
import { DockerServeClient } from './DockerServeClient/DockerServeClient';

// CONSIDER
// Any of the commands related to Docker context can take a very long time to execute (a minute or longer)
// if the current context refers to a remote Docker engine that is unreachable (e.g. machine is shut down).
// Consider having our own timeout for execution of any context-related Docker CLI commands.
// The following timeout is for _starting_ the command only; in the current implementation there is no timeot
// for command duration.
const ContextCmdExecOptions: ExecOptions = { timeout: 5000 };

const dockerConfigFile = path.join(os.homedir(), '.docker', 'config.json');
const dockerContextsFolder = path.join(os.homedir(), '.docker', 'contexts', 'meta');

const WindowsLocalPipe = 'npipe:////./pipe/docker_engine';
const UnixLocalPipe = 'unix:///var/run/docker.sock';

const defaultContext: Partial<DockerContext> = {
    Id: 'default',
    Name: 'default',
    Description: 'Current DOCKER_HOST based configuration',
    Type: 'moby',
};

// These contexts are used by external consumers (e.g. the "Remote - Containers" extension), and should NOT be changed
type VSCodeContext = 'vscode-docker:aciContext' | 'vscode-docker:newSdkContext' | 'vscode-docker:newCliPresent';

export interface ContextManager {
    readonly onContextChanged: Event<DockerContext>;
    refresh(): Promise<void>;
    getContexts(): Promise<DockerContext[]>;
    getCurrentContext(): Promise<DockerContext>;

    inspect(actionContext: IActionContext, contextName: string): Promise<DockerContextInspection>;
    use(actionContext: IActionContext, contextName: string): Promise<void>;
    remove(actionContext: IActionContext, contextName: string): Promise<void>;

    isNewCli(): Promise<boolean>;
}

// TODO: consider a periodic refresh as a catch-all; but make sure it compares old data to new before firing a change event
// TODO: so that non-changes don't result in everything getting refreshed
export class DockerContextManager implements ContextManager, Disposable {
    private readonly emitter: EventEmitter<DockerContext> = new EventEmitter<DockerContext>();
    private readonly contextsCache: AsyncLazy<DockerContext[]>;
    private readonly newCli: AsyncLazy<boolean>;
    private readonly configFileWatcher: fs.FSWatcher;
    private readonly contextFolderWatcher: fs.FSWatcher;
    private refreshing: boolean = false;

    public constructor() {
        this.contextsCache = new AsyncLazy(async () => this.loadContexts());

        this.newCli = new AsyncLazy(async () => this.getCliVersion());

        // The file watchers are not strictly necessary; they serve to help the extension detect context switches
        // that are done in CLI. Worst case, a user would have to restart VSCode.
        /* eslint-disable @typescript-eslint/tslint/config */
        try {
            if (fse.existsSync(dockerConfigFile)) {
                this.configFileWatcher = fs.watch(dockerConfigFile, async () => this.refresh());
            }
        } catch { } // Best effort

        try {
            if (fse.existsSync(dockerContextsFolder)) {
                this.contextFolderWatcher = fs.watch(dockerContextsFolder, async () => this.refresh());
            }
        } catch { } // Best effort
        /* eslint-enable @typescript-eslint/tslint/config */
    }

    public dispose(): void {
        void this.configFileWatcher?.close();
        void this.contextFolderWatcher?.close();

        // No event is fired so the client present at the end needs to be disposed manually
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

            // Because the cache is cleared, this will load all the contexts before returning the current one
            const currentContext = await this.getCurrentContext();

            void ext.dockerClient?.dispose();

            // Create a new client
            if (isNewContextType(currentContext.Type)) {
                // Currently vscode-docker:aciContext vscode-docker:newSdkContext mean the same thing
                // But that probably won't be true in the future, so define both as separate concepts now
                await this.setVsCodeContext('vscode-docker:aciContext', true);
                await this.setVsCodeContext('vscode-docker:newSdkContext', true);
                ext.dockerClient = new DockerServeClient();
            } else {
                await this.setVsCodeContext('vscode-docker:aciContext', false);
                await this.setVsCodeContext('vscode-docker:newSdkContext', false);
                ext.dockerClient = new DockerodeApiClient(currentContext);
            }

            // This will refresh the tree
            this.emitter.fire(currentContext);
        } catch (err) {
            ext.treeInitError = err;
        } finally {
            this.refreshing = false;
        }

        // Lastly, trigger a CLI version check but don't wait
        void this.newCli.getValue();
    }

    public async getContexts(): Promise<DockerContext[]> {
        return this.contextsCache.getValue();
    }

    public async getCurrentContext(): Promise<DockerContext> {
        const contexts = await this.getContexts();
        return contexts.find(c => c.Current);
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

    public async isNewCli(): Promise<boolean> {
        return this.newCli.getValue();
    }

    private async loadContexts(): Promise<DockerContext[]> {
        let loadResult = await callWithTelemetryAndErrorHandling(ext.dockerClient ? 'docker-context.change' : 'docker-context.initialize', async (actionContext: IActionContext) => {
            // docker-context.initialize and docker-context.change should be treated as "activation events", in that they aren't real user action
            actionContext.telemetry.properties.isActivationEvent = 'true';
            actionContext.errorHandling.rethrow = true; // Errors are handled outside of this scope

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
                dockerHost = isWindows() ? WindowsLocalPipe : UnixLocalPipe;
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
            const { stdout } = await execAsync('docker context ls --format="{{json .}}"', ContextCmdExecOptions);
            const lines = stdout.split(/\r?\n/im);

            for (const line of lines) {
                // Blank lines should be skipped
                if (!line) {
                    continue;
                }

                const context = JSON.parse(line) as DockerContext;
                result.push({
                    ...context,
                    Id: context.Name,
                    Type: context.Type || context.DockerEndpoint ? 'moby' : 'aci', // TODO: this basically assumes no Type and no DockerEndpoint => aci
                });
            }

            const currentContext = result.find(c => c.Current);

            if (currentContext.Name === 'default') {
                actionContext.telemetry.properties.hostSource = 'defaultContextSelected';
            } else {
                actionContext.telemetry.properties.hostSource = 'customContextSelected'
            }

            try {
                if (currentContext.Type === 'aci') {
                    actionContext.telemetry.properties.hostProtocol = 'aci';
                } else {
                    actionContext.telemetry.properties.hostProtocol = new URL(currentContext.DockerEndpoint).protocol;
                }
            } catch {
                actionContext.telemetry.properties.hostProtocol = 'unknown';
            }

            return result;
        });

        // If the load failed or is otherwise empty, return the default
        // That way a returned value is ensured by this method
        if (!loadResult) {
            loadResult = [{
                ...defaultContext,
                Current: true,
                DockerEndpoint: isWindows() ? WindowsLocalPipe : UnixLocalPipe,
            } as DockerContext];
        }

        return loadResult;
    }

    private async getCliVersion(): Promise<boolean> {
        try {
            let result: boolean = false;
            const contexts = await this.contextsCache.getValue();

            if (contexts.some(c => isNewContextType(c.Type))) {
                // If there are any new contexts we automatically know it's the new CLI
                result = true;
            } else {
                // Otherwise we look at the output of `docker serve --help`
                // TODO: this is not a very good heuristic
                const { stdout } = await execAsync('docker serve --help');

                if (/^\s*Start an api server/i.test(stdout)) {
                    result = true;
                }
            }

            // Set the VSCode context to the result (which may expose commands, etc.)
            await this.setVsCodeContext('vscode-docker:newCliPresent', result);
            return result;
        } catch { } // Best effort
    }

    private async setVsCodeContext(vsCodeContext: VSCodeContext, value: boolean): Promise<void> {
        return commands.executeCommand('setContext', vsCodeContext, value);
    }
}
