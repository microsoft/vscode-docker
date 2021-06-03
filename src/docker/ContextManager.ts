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
import { commands, Event, EventEmitter, window, workspace } from 'vscode';
import { Disposable } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { AsyncLazy } from '../utils/lazy';
import { isWindows } from '../utils/osUtils';
import { execAsync, spawnAsync } from '../utils/spawnAsync';
import { dockerExePath } from '../utils/dockerExePathProvider';
import { ContextType, DockerContext, DockerContextInspection, isNewContextType } from './Contexts';

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
    ContextType: 'moby',
};

// These contexts are used by external consumers (e.g. the "Remote - Containers" extension), and should NOT be changed
type VSCodeContext = 'vscode-docker:aciContext' | 'vscode-docker:newSdkContext' | 'vscode-docker:newCliPresent' | 'vscode-docker:contextLocked';

export interface ContextManager {
    readonly onContextChanged: Event<DockerContext>;
    refresh(): Promise<void>;
    getContexts(): Promise<DockerContext[]>;
    getCurrentContext(): Promise<DockerContext>;
    getCurrentContextType(): Promise<ContextType>;

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
        try {
            if (fse.existsSync(dockerConfigFile)) {
                this.configFileWatcher = fs.watch(dockerConfigFile, async () => this.refresh());
            }
        } catch {
            // Best effort
        }

        try {
            if (fse.existsSync(dockerContextsFolder)) {
                this.contextFolderWatcher = fs.watch(dockerContextsFolder, async () => this.refresh());
            }
        } catch {
            // Best effort
        }
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

            // Emit some info about what is being connected to
            /* eslint-disable @typescript-eslint/indent */ // The linter is completely wrong about indentation here
            ext.outputChannel.appendLine(
                localize('vscode-docker.docker.contextManager.targetLog',
                    'The Docker extension will try to connect to \'{0}\', via context \'{1}\'.',
                    currentContext.DockerEndpoint || currentContext.ContextType,
                    currentContext.Name
                )
            );
            /* eslint-enable @typescript-eslint/indent */

            // Create a new client
            if (isNewContextType(currentContext.ContextType)) {
                // Currently vscode-docker:aciContext vscode-docker:newSdkContext mean the same thing
                // But that probably won't be true in the future, so define both as separate concepts now
                this.setVsCodeContext('vscode-docker:aciContext', true);
                this.setVsCodeContext('vscode-docker:newSdkContext', true);

                const dsc = await import('./DockerServeClient/DockerServeClient');
                ext.dockerClient = new dsc.DockerServeClient(currentContext);
            } else {
                this.setVsCodeContext('vscode-docker:aciContext', false);
                this.setVsCodeContext('vscode-docker:newSdkContext', false);

                const dockerode = await import('./DockerodeApiClient/DockerodeApiClient');
                ext.dockerClient = new dockerode.DockerodeApiClient(currentContext);
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

    public async getCurrentContextType(): Promise<ContextType> {
        return (await this.getCurrentContext()).ContextType;
    }

    public async inspect(actionContext: IActionContext, contextName: string): Promise<DockerContextInspection> {
        const { stdout } = await execAsync(`${dockerExePath(actionContext)} context inspect ${contextName}`, { timeout: 10000 });

        // The result is an array with one entry
        const result: DockerContextInspection[] = JSON.parse(stdout) as DockerContextInspection[];
        return result[0];
    }

    public async use(actionContext: IActionContext, contextName: string): Promise<void> {
        const useCmd: string = `${dockerExePath(actionContext)} context use ${contextName}`;
        await execAsync(useCmd, ContextCmdExecOptions);
    }

    public async remove(actionContext: IActionContext, contextName: string): Promise<void> {
        const removeCmd: string = `${dockerExePath(actionContext)} context rm ${contextName}`;
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
            actionContext.errorHandling.suppressDisplay = true;

            ext.treeInitError = undefined;

            let dockerHostEnv: string | undefined;
            let dockerContextEnv: string | undefined;
            const config = workspace.getConfiguration('docker');
            if ((dockerHostEnv = config.get('host'))) { // Assignment + check is intentional
                actionContext.telemetry.properties.hostSource = 'docker.host';
            } else if ((dockerHostEnv = process.env.DOCKER_HOST)) { // Assignment + check is intentional
                actionContext.telemetry.properties.hostSource = 'env';
            } else if ((dockerContextEnv = config.get('context'))) { // Assignment + check is intentional
                actionContext.telemetry.properties.hostSource = 'docker.context';
            } else if ((dockerContextEnv = process.env.DOCKER_CONTEXT)) { // Assignment + check is intentional
                actionContext.telemetry.properties.hostSource = 'envContext';
            } else if (!fse.pathExistsSync(dockerContextsFolder) || fse.readdirSync(dockerContextsFolder).length === 0) { // Sync is intentionally used for performance, this is on the activation code path
                // If there's nothing inside ~/.docker/contexts/meta, then there's only the default, unmodifiable DOCKER_HOST-based context
                // It is unnecessary to call `docker context inspect`
                actionContext.telemetry.properties.hostSource = 'defaultContextOnly';
                dockerHostEnv = isWindows() ? WindowsLocalPipe : UnixLocalPipe;
            } else {
                dockerHostEnv = undefined;
            }

            if (dockerHostEnv !== undefined) {
                try {
                    // This will try to parse the URL, using the same logic docker-modem does
                    actionContext.telemetry.properties.hostProtocol = new URL(dockerHostEnv).protocol;
                } catch (err) {
                    // If URL parsing fails, let's catch it and give a better error message
                    const message = actionContext.telemetry.properties.hostSource === 'docker.host' ?
                        localize('vscode-docker.docker.contextManager.invalidHostSetting', 'The value provided for the setting `docker.host` is invalid. It must include the protocol, for example, ssh://myuser@mymachine or tcp://1.2.3.4.') :
                        localize('vscode-docker.docker.contextManager.invalidHostEnv', 'The value provided for the environment variable `DOCKER_HOST` is invalid. It must include the protocol, for example, ssh://myuser@mymachine or tcp://1.2.3.4.');
                    const button = localize('vscode-docker.docker.contextManager.openSettings', 'Open Settings');

                    void window.showErrorMessage(message, button)
                        .then((result: string) => {
                            if (result === button) {
                                void commands.executeCommand('workbench.action.openSettings', 'docker.host');
                            }
                        });

                    // Rethrow and suppress display since we already showed an error message
                    actionContext.errorHandling.suppressDisplay = true;
                    throw err;
                }

                this.setVsCodeContext('vscode-docker:contextLocked', true);

                return [{
                    ...defaultContext,
                    Current: true,
                    DockerEndpoint: dockerHostEnv,
                } as DockerContext];
            }

            // No value for DOCKER_HOST, and multiple contexts exist, so check them
            const result: DockerContext[] = [];

            // Setting the DOCKER_CONTEXT environment variable to whatever is passed along means the CLI will always
            // return that specified context as Current = true. This way we don't need extra logic below in parsing.
            // TODO: eventually change to `docker context ls --format json`
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const { stdout } = await execAsync(`${dockerExePath()} context ls --format="{{json .}}"`, { ...ContextCmdExecOptions, env: { ...process.env, DOCKER_CONTEXT: dockerContextEnv } });

            try {
                // Try parsing as-is; newer CLIs output a JSON object array
                const contexts = JSON.parse(stdout) as DockerContext[];

                result.push(...contexts.map(toDockerContext));
            } catch {
                // Otherwise split by line, older CLIs output one JSON object per line
                const lines = stdout.split(/\r?\n/im);

                for (const line of lines) {
                    // Blank lines should be skipped
                    if (!line) {
                        continue;
                    }

                    const context = JSON.parse(line) as DockerContext;
                    result.push(toDockerContext(context));
                }
            }

            const currentContext = result.find(c => c.Current);

            if (currentContext.Name === 'default') {
                actionContext.telemetry.properties.hostSource = 'defaultContextSelected';
            } else {
                actionContext.telemetry.properties.hostSource = 'customContextSelected';
            }

            try {
                if (isNewContextType(currentContext.ContextType)) {
                    actionContext.telemetry.properties.hostProtocol = currentContext.ContextType;
                } else {
                    actionContext.telemetry.properties.hostProtocol = new URL(currentContext.DockerEndpoint).protocol;
                }
            } catch {
                actionContext.telemetry.properties.hostProtocol = 'unknown';
            }

            if (dockerContextEnv) {
                this.setVsCodeContext('vscode-docker:contextLocked', true);
            } else {
                this.setVsCodeContext('vscode-docker:contextLocked', false);
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

            if (contexts.some(c => isNewContextType(c.ContextType))) {
                // If there are any new contexts we automatically know it's the new CLI
                result = true;
            } else {
                // Otherwise we look at the output of `docker serve --help`
                // TODO: this is not a very good heuristic
                const { stdout } = await execAsync(`${dockerExePath()} serve --help`);

                if (/^\s*Start an api server/i.test(stdout)) {
                    result = true;
                }
            }

            // Set the VSCode context to the result (which may expose commands, etc.)
            this.setVsCodeContext('vscode-docker:newCliPresent', result);
            return result;
        } catch {
            // Best effort
        }
    }

    private setVsCodeContext(vsCodeContext: VSCodeContext, value: boolean): void {
        void commands.executeCommand('setContext', vsCodeContext, value);
    }
}

function toDockerContext(cliContext: Partial<DockerContext>): DockerContext {
    return {
        ...cliContext,
        Id: cliContext.Name,
        ContextType: cliContext.ContextType || (cliContext.DockerEndpoint ? 'moby' : 'aci'), // TODO: this basically assumes no Type and no DockerEndpoint => aci
    } as DockerContext;
}
