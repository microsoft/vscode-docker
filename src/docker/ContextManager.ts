/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { ExecOptions } from 'child_process';
import { URL } from 'url';
import { commands, Disposable, Event, EventEmitter, RelativePattern, window, workspace } from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { AsyncLazy } from '../utils/lazy';
import { isWindows } from '../utils/osUtils';
import { execAsync, spawnAsync } from '../utils/spawnAsync';
import { ContextType, DockerContext, DockerContextInspection, isNewContextType } from './Contexts';
import { ContextLoadingClient } from './ContextLoadingClient/ContextLoadingClient';
import { getDockerodeClient, getDockerServeClient } from '../utils/lazyPackages';

// CONSIDER
// Any of the commands related to Docker context can take a very long time to execute (a minute or longer)
// if the current context refers to a remote Docker engine that is unreachable (e.g. machine is shut down).
// Consider having our own timeout for execution of any context-related Docker CLI commands.
// The following timeout is for _starting_ the command only; in the current implementation there is no timeot
// for command duration.
const ContextCmdExecOptions: ExecOptions = { timeout: 5000 };

const dockerConfigFolder = path.join(os.homedir(), '.docker');
const dockerConfigFile = 'config.json';
const dockerContextsFolder = path.join(dockerConfigFolder, 'contexts', 'meta');

const WindowsLocalPipe = 'npipe:////./pipe/docker_engine';
const UnixLocalPipe = 'unix:///var/run/docker.sock';

const DefaultDockerPath: string = 'docker';

const OldComposeCommand: string = 'docker-compose';
const NewComposeCommand: string = 'docker compose';

const defaultContext: Partial<DockerContext> = {
    Id: 'default',
    Name: 'default',
    Description: 'Current DOCKER_HOST based configuration',
    ContextType: 'moby',
};

export const defaultContextNames = ['default', 'desktop-windows', 'desktop-linux'];

// These contexts are used by external consumers (e.g. the "Remote - Containers" extension), and should NOT be changed
type VSCodeContext = 'vscode-docker:aciContext' | 'vscode-docker:newSdkContext' | 'vscode-docker:newCliPresent' | 'vscode-docker:contextLocked';

export interface ContextManager {
    readonly onContextChanged: Event<DockerContext>;
    refresh(): Promise<void>;
    getContexts(): Promise<DockerContext[]>;
    getCurrentContext(): Promise<DockerContext>;
    getCurrentContextType(): Promise<ContextType>;

    getDockerCommand(context?: IActionContext): string;
    getComposeCommand(context?: IActionContext): Promise<string>;

    inspect(actionContext: IActionContext, contextName: string): Promise<DockerContextInspection>;
    use(actionContext: IActionContext, contextName: string): Promise<void>;
    remove(actionContext: IActionContext, contextName: string): Promise<void>;

    isNewCli(): Promise<boolean>;
}

// TODO: consider a periodic refresh as a catch-all; but make sure it compares old data to new before firing a change event
// TODO: so that non-changes don't result in everything getting refreshed
export class DockerContextManager implements ContextManager, Disposable {
    private readonly contextChangedEmitter = new EventEmitter<DockerContext>();
    private readonly loadingFinishedEmitter = new EventEmitter<unknown | undefined>();
    private readonly contextsCache: AsyncLazy<DockerContext[]>;
    private readonly newCli: AsyncLazy<boolean>;
    private readonly disposables: Disposable[] = [];
    private refreshing: boolean = false;

    private readonly composeCommandLazy: AsyncLazy<string>;

    public constructor() {
        this.contextsCache = new AsyncLazy(async () => this.loadContexts());

        this.newCli = new AsyncLazy(async () => this.getCliVersion());

        // The file watchers are not strictly necessary; they serve to help the extension detect context switches
        // that are done in CLI. Worst case, a user would have to restart VSCode.
        try {
            if (fse.existsSync(path.join(dockerConfigFolder, dockerConfigFile))) {
                const configFileWatcher = workspace.createFileSystemWatcher(
                    new RelativePattern(dockerConfigFolder, dockerConfigFile),
                    true, // Don't expect file to be created (since we already verified its existence)
                    false, // Do expect file to change
                    true // Don't expect file to be deleted (are they uninstalling?!), but if they do, then the tree view will get an ENOENT that it will replace with a nice "Is Docker running?" error message
                );
                this.disposables.push(configFileWatcher);
                configFileWatcher.onDidChange(async () => this.refresh(), this);
            }
        } catch {
            // Best effort
        }

        try {
            if (fse.existsSync(dockerContextsFolder)) {
                const contextFolderWatcher = workspace.createFileSystemWatcher(
                    new RelativePattern(dockerContextsFolder, '**')
                );
                this.disposables.push(contextFolderWatcher);
                contextFolderWatcher.onDidCreate(async () => this.refresh(), this);
                contextFolderWatcher.onDidChange(async () => this.refresh(), this);
                contextFolderWatcher.onDidDelete(async () => this.refresh(), this);
            }
        } catch {
            // Best effort
        }

        // Set up a lazy to determine the compose command to use, and also set up clearing it on context change
        this.composeCommandLazy = new AsyncLazy<string>(async () => this.determineComposeCommand());
        this.disposables.push(
            this.onContextChanged(() => this.composeCommandLazy.clear())
        );

        // Set the initial DockerApiClient to be the context loading client
        ext.dockerClient = new ContextLoadingClient(this.loadingFinishedEmitter.event);
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());

        // No event is fired so the client present at the end needs to be disposed manually
        // Additionally, it is not part of the disposables array because it is disposed anytime the context changes, not just at the end
        ext.dockerClient?.dispose();
    }

    public get onContextChanged(): Event<DockerContext> {
        return this.contextChangedEmitter.event;
    }

    public async refresh(): Promise<void> {
        if (this.refreshing) {
            return;
        }

        try {
            this.refreshing = true;
            ext.treeInitError = undefined;

            this.contextsCache.clear();

            // Because the cache is cleared, this will load all the contexts before returning the current one
            const currentContext = await this.getCurrentContext();

            ext.dockerClient?.dispose();

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

                const dsc = await getDockerServeClient();
                ext.dockerClient = new dsc.DockerServeClient(currentContext);
            } else {
                this.setVsCodeContext('vscode-docker:aciContext', false);
                this.setVsCodeContext('vscode-docker:newSdkContext', false);

                const dockerode = await getDockerodeClient();
                ext.dockerClient = new dockerode.DockerodeApiClient(currentContext);
            }

            // This will allow the ContextLoadingClient to proceed
            this.loadingFinishedEmitter.fire(undefined);

            // This will refresh the tree
            this.contextChangedEmitter.fire(currentContext);
        } catch (err) {
            ext.treeInitError = err;

            // This will allow the ContextLoadingClient to return an error
            this.loadingFinishedEmitter.fire(err);
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
        const { stdout } = await execAsync(`${this.getDockerCommand(actionContext)} context inspect ${contextName}`, { timeout: 10000 });

        // The result is an array with one entry
        const result: DockerContextInspection[] = JSON.parse(stdout) as DockerContextInspection[];
        return result[0];
    }

    public async use(actionContext: IActionContext, contextName: string): Promise<void> {
        const useCmd: string = `${this.getDockerCommand(actionContext)} context use ${contextName}`;
        await execAsync(useCmd, ContextCmdExecOptions);
    }

    public async remove(actionContext: IActionContext, contextName: string): Promise<void> {
        const removeCmd: string = `${this.getDockerCommand(actionContext)} context rm ${contextName}`;
        await spawnAsync(removeCmd, ContextCmdExecOptions);
    }

    public async isNewCli(): Promise<boolean> {
        return this.newCli.getValue();
    }

    public getDockerCommand(context?: IActionContext): string {
        const retval = workspace.getConfiguration('docker').get('dockerPath', DefaultDockerPath);

        if (retval !== DefaultDockerPath && context) {
            context.telemetry.properties.nonstandardDockerPath = 'true';
        }

        return retval;
    }

    public async getComposeCommand(context?: IActionContext): Promise<string> {
        const retval = await this.composeCommandLazy.getValue();

        if (context) {
            if (retval === NewComposeCommand || retval === OldComposeCommand) {
                context.telemetry.properties.composeCommand = retval;
            } else {
                context.telemetry.properties.composeCommand = 'other';
            }
        }

        return retval;
    }

    private async loadContexts(): Promise<DockerContext[]> {
        return await callWithTelemetryAndErrorHandling(ext.dockerClient ? 'docker-context.change' : 'docker-context.initialize', async (actionContext: IActionContext) => {
            // docker-context.initialize and docker-context.change should be treated as "activation events", in that they aren't real user action
            actionContext.telemetry.properties.isActivationEvent = 'true';
            actionContext.errorHandling.rethrow = true; // Errors are handled outside of this scope
            actionContext.errorHandling.suppressDisplay = true;

            let contextList: DockerContext[] | undefined;

            // First, we'll try shortcutting by getting a fixed context from extension settings, then from environment, then from filesystem clues
            const fixedContext =
                this.tryGetContextFromSettings(actionContext) ||
                this.tryGetContextFromEnvironment(actionContext) ||
                this.tryGetContextFromFilesystemClues(actionContext);

            // A result from any of these three implies that there is only one context, or it is fixed by `docker.host` / `DOCKER_HOST`, or `docker.context` / `DOCKER_CONTEXT`
            // As such, we will lock to the current context
            // Otherwise, unlock in case we were previously locked
            if (fixedContext) {
                this.setVsCodeContext('vscode-docker:contextLocked', true);
            } else {
                this.setVsCodeContext('vscode-docker:contextLocked', false);
            }

            // If the result is undefined, there are (probably) multiple contexts and none is chosen by `docker.context` or `DOCKER_CONTEXT`, so we will need to do a context listing
            // If the result is a string, that means `docker.context` or `DOCKER_CONTEXT` are set, so we will also need to do a context listing
            if (typeof (fixedContext) === 'undefined' || typeof (fixedContext) === 'string') {
                contextList =
                    (await this.tryGetContextsFromApi(actionContext, fixedContext)) ||
                    (await this.tryGetContextsFromCli(actionContext, fixedContext));
            } else {
                contextList = [fixedContext];
            }

            if (!contextList || contextList.length === 0) {
                // If the load is empty, return the default
                // That way a returned value is ensured by this method
                // And `setHostProtocolFromContextList` will always have a non-empty input
                contextList = [{
                    ...defaultContext,
                    Current: true,
                    DockerEndpoint: isWindows() ? WindowsLocalPipe : UnixLocalPipe,
                } as DockerContext];
            }

            this.setHostProtocolFromContextList(actionContext, contextList);

            return contextList;
        });
    }

    private tryGetContextFromSettings(actionContext: IActionContext): DockerContext | undefined | string {
        const config = workspace.getConfiguration('docker');
        let dockerHost: string | undefined;
        let dockerContext: string | undefined;

        if ((dockerHost = config.get('host'))) { // Assignment + check is intentional
            actionContext.telemetry.properties.hostSource = 'docker.host';

            return {
                ...defaultContext,
                Current: true,
                DockerEndpoint: dockerHost,
            } as DockerContext;
        } else if ((dockerContext = config.get('context'))) { // Assignment + check is intentional
            actionContext.telemetry.properties.hostSource = 'docker.context';

            return dockerContext;
        }

        return undefined;
    }

    private tryGetContextFromEnvironment(actionContext: IActionContext): DockerContext | undefined | string {
        let dockerHost: string | undefined;
        let dockerContext: string | undefined;

        if ((dockerHost = process.env.DOCKER_HOST)) { // Assignment + check is intentional
            actionContext.telemetry.properties.hostSource = 'env';

            return {
                ...defaultContext,
                Current: true,
                DockerEndpoint: dockerHost,
            } as DockerContext;
        } else if ((dockerContext = process.env.DOCKER_CONTEXT)) { // Assignment + check is intentional
            actionContext.telemetry.properties.hostSource = 'envContext';

            return dockerContext;
        }

        return undefined;
    }

    private tryGetContextFromFilesystemClues(actionContext: IActionContext): DockerContext | undefined {
        // If there's nothing inside ~/.docker/contexts/meta (or it doesn't exist), then there's only the default, unmodifiable DOCKER_HOST-based context
        // It is unnecessary to call `docker context inspect`
        if (!fse.pathExistsSync(dockerContextsFolder) || fse.readdirSync(dockerContextsFolder).length === 0) { // Sync is intentionally used for performance, this is on the activation code path
            actionContext.telemetry.properties.hostSource = 'defaultContextOnly';

            return {
                ...defaultContext,
                Current: true,
                DockerEndpoint: isWindows() ? WindowsLocalPipe : UnixLocalPipe,
            } as DockerContext;
        }

        return undefined;
    }

    private async tryGetContextsFromApi(actionContext: IActionContext, maybeFixedContextName: string | undefined): Promise<Promise<DockerContext[] | undefined>> {
        try {
            const dsc = await getDockerServeClient();
            const client = new dsc.DockerServeClient({ Name: maybeFixedContextName } as DockerContext); // Context name is the only thing used by DockerServeClient's constructor
            const result = await client.getContexts(actionContext);
            this.setHostSourceFromContextList(actionContext, result, 'api');
            return result;
        } catch {
            // Best effort
        }

        return undefined;
    }

    private async tryGetContextsFromCli(actionContext: IActionContext, maybeFixedContextName: string | undefined): Promise<DockerContext[] | undefined> {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { stdout } = await execAsync(`${this.getDockerCommand(actionContext)} context ls --format="{{json .}}"`, { ...ContextCmdExecOptions, env: { ...process.env, DOCKER_CONTEXT: maybeFixedContextName } });

        const result: DockerContext[] = [];

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

        this.setHostSourceFromContextList(actionContext, result, 'cli');
        return result;
    }

    private setHostSourceFromContextList(actionContext: IActionContext, contexts: DockerContext[], contextSource: 'api' | 'cli') {
        const currentContext = contexts.find(c => c.Current);

        if (!currentContext) {
            actionContext.telemetry.properties.hostSource = 'unknown';
            return;
        }

        actionContext.telemetry.properties.contextSource = contextSource;

        // This won't overwrite the value if it's already set, because above it may have been set by `docker.context` / `DOCKER_CONTEXT` already
        if (defaultContextNames.indexOf(currentContext.Name) >= 0) {
            actionContext.telemetry.properties.hostSource = actionContext.telemetry.properties.hostSource || 'defaultContextSelected';
        } else {
            actionContext.telemetry.properties.hostSource = actionContext.telemetry.properties.hostSource || 'customContextSelected';
        }
    }

    private setHostProtocolFromContextList(actionContext: IActionContext, contexts: DockerContext[]) {
        const currentContext = contexts.find(c => c.Current);

        if (isNewContextType(currentContext.ContextType)) {
            actionContext.telemetry.properties.hostProtocol = currentContext.ContextType;
        } else {
            try {
                actionContext.telemetry.properties.hostProtocol = new URL(currentContext.DockerEndpoint).protocol;
            } catch (err) {
                // If URL parsing fails, let's catch it and give a better error message to help users from a common mistake
                actionContext.telemetry.properties.hostProtocol = 'unknown';
                const message =
                    localize('vscode-docker.docker.contextManager.invalidHostSetting', 'The value provided for the setting `docker.host` or environment variable `DOCKER_HOST` is invalid. It must include the protocol, for example, ssh://myuser@mymachine or tcp://1.2.3.4.');
                const button = localize('vscode-docker.docker.contextManager.openSettings', 'Open Settings');

                void window.showErrorMessage(message, button)
                    .then((result: string) => {
                        if (result === button) {
                            void commands.executeCommand('workbench.action.openSettings', 'docker.host');
                        }
                    });

                // Rethrow
                throw err;
            }
        }
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
                const { stdout } = await execAsync(`${this.getDockerCommand()} serve --help`);

                if (/^\s*Start an api server/i.test(stdout)) {
                    result = true;
                }
            }

            // Set the VSCode context to the result (which may expose commands, etc.)
            this.setVsCodeContext('vscode-docker:newCliPresent', result);
            return result;
        } catch {
            // Best effort
            return false;
        }
    }

    private setVsCodeContext(vsCodeContext: VSCodeContext, value: boolean): void {
        void commands.executeCommand('setContext', vsCodeContext, value);
    }

    private async determineComposeCommand(): Promise<string> {
        const settingValue = workspace.getConfiguration('docker').get<string | undefined>('composeCommand');

        if (settingValue) {
            // If a value is configured by settings, we'll return it unconditionally
            return settingValue;
        }

        // Otherwise, autodetect!
        try {
            // Try running `docker compose version`...
            await execAsync(`${NewComposeCommand} version`);

            // If that command worked, then assume we should use it
            return NewComposeCommand;
        } catch {
            // Otherwise fall back to the old command
            return OldComposeCommand;
        }
    }
}

function toDockerContext(cliContext: Partial<DockerContext>): DockerContext {
    return {
        ...cliContext,
        Id: cliContext.Name,
        ContextType: cliContext.ContextType || (cliContext.DockerEndpoint ? 'moby' : 'aci'), // TODO: this basically assumes no Type and no DockerEndpoint => aci
    } as DockerContext;
}
