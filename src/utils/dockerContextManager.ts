/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExecOptions } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as url from 'url';
import { workspace, WorkspaceConfiguration } from 'vscode';
import { parseError } from "vscode-azureextensionui";
import LineSplitter from '../debugging/coreclr/lineSplitter';
import { localize } from '../localize';
import { LocalOSProvider } from './LocalOSProvider';
import { execAsync, spawnAsync } from './spawnAsync';

// CONSIDER
// Any of the commands related to Docker context can take a very long time to execute (a minute or longer)
// if the current context refers to a remote Docker engine that is unreachable (e.g. machine is shut down).
// Consider having our own timeout for execution of any context-related Docker CLI commands.
// The following timeout is for _starting_ the command only; in the current implementation there is no timeot
// for command duration.
const ContextCmdExecOptions: ExecOptions = { timeout: 5000 }

const DOCKER_CONTEXT: string = 'DOCKER_CONTEXT';
const DefaultRefreshIntervalSec: number = 20;
const osp = new LocalOSProvider();
const DockerConfigPath: string = osp.pathJoin(osp.os, osp.homedir, '.docker');
const DockerConfigFilePath: string = osp.pathJoin(osp.os, DockerConfigPath, 'config.json');
const DockerContextMetasPath: string = osp.pathJoin(osp.os, DockerConfigPath, 'contexts', 'meta');


export interface IDockerEndpoint {
    Host: string,
    SkipTLSVerify?: boolean
}
export interface IDockerEndpoints {
    [name: string]: IDockerEndpoint
}

export interface IDockerTlsMaterial {
    // The convention seems to be that up to 3 files constitute "TLS material"
    // If one file is present, it is the CA certificate to verify Docker endpoint identity (public/system CA pool is subsituted by custom CA)
    // If two files are present, it is the client certificate and client key to authenticate the client
    // If three files are present, it is the CA certificate for Docker endpoint verification, client certificate and client key, in that order
    // See https://docs.docker.com/engine/security/https/ for more details
    // This is all quite complicated and VS Code Docker extension does not support these settings
    [name: string]: string[]
}

export interface IDockerContextMetadata {
    [name: string]: unknown
}

export interface IDockerContextStorage {
    MetadataPath?: string,
    TLSPath?: string
}

export interface IDockerContext {
    Name: string,
    Metadata: IDockerContextMetadata,
    Endpoints: IDockerEndpoints,
    TLSMaterial: IDockerTlsMaterial,
    Storage: IDockerContextStorage,
    FullSpec: string,       // Useful for checking if the context didn't change
    HostProtocol?: string   // http, https, ssh, unix, npipe, ...
}

export interface IDockerContextCheckResult {
    Context: IDockerContext | undefined,
    Changed: boolean
}

export interface IDockerContextListItem {
    Name: string,
    Current: boolean
}

export class DockerContextManager {
    private readonly contextRefreshIntervalMs: number;
    private lastContextCheckTimestamp: number;
    private cachedContext: IDockerContext;
    private lastDockerConfigDigest: string;

    public constructor() {
        this.lastContextCheckTimestamp = 0;
        const configOptions: WorkspaceConfiguration = workspace.getConfiguration('docker');
        this.contextRefreshIntervalMs = configOptions.get<number>('contextRefreshInterval', DefaultRefreshIntervalSec) * 1000;
    }

    public async getCurrentContext(): Promise<IDockerContextCheckResult> {
        let contextChanged: boolean = false;

        // The first time this is called, this.lastContextCheckTimestamp will be 0 so this check will certainly pass
        if (Date.now() - this.lastContextCheckTimestamp > this.contextRefreshIntervalMs) {
            try {
                if (!(await fse.pathExists(DockerContextMetasPath)) || (await fse.readdir(DockerContextMetasPath)).length === 0) {
                    // If there's nothing inside ~/.docker/contexts/meta, then there's only the default, unmodifiable DOCKER_HOST-based context
                    // Since DOCKER_HOST is handled in addDockerSettingsToEnv, it is unnecessary to call `docker context inspect`
                    contextChanged = this.cachedContext !== undefined;
                    this.cachedContext = undefined;
                } else {
                    // More than the default context exists, so we'll check the config digest and do a `docker context inspect` call if needed
                    const dockerConfigDigest: string = await this.getDockerConfigDigest();

                    if (!dockerConfigDigest || dockerConfigDigest !== this.lastDockerConfigDigest) {
                        this.lastDockerConfigDigest = dockerConfigDigest;
                        // Config file will change when Docker context is changed, but opposite is not necessarily true
                        // (i.e. config file might change for other reasons).
                        contextChanged = await this.refreshCachedDockerContext();
                    }
                }
            } finally {
                // Start counting time _after_ we are done with all the I/O
                this.lastContextCheckTimestamp = Date.now();
            }
        }

        return {
            Context: this.cachedContext,
            Changed: contextChanged
        };
    }

    public expediteContextCheck(): void {
        this.lastContextCheckTimestamp = 0;
    }

    public async listAll(): Promise<IDockerContextListItem[]> {
        let execResult: {
            stdout: string;
        };
        const contextListCmd = 'docker context ls --format="{{ .Name }} {{ .Current }}"';

        execResult = await execAsync(contextListCmd, ContextCmdExecOptions);

        const contextRecords = LineSplitter.splitLines(execResult.stdout);
        if (!contextRecords || contextRecords.length === 0) {
            throw new Error(localize('vscode-docker.dockerContext.contextListRetrievalFailed', 'Docker contexts could not be listed'));
        }

        const items = contextRecords.map(record => {
            const parts = record.split(' ');
            return { Name: parts[0], Current: parts[1] === 'true' };
        });
        return items;
    }

    public async inspect(contextName: string): Promise<string> {
        let execResult: {
            stdout: string;
        };
        const inspectCmd: string = `docker context inspect ${contextName}`;
        execResult = await execAsync(inspectCmd, ContextCmdExecOptions);
        return execResult.stdout;
    }

    public async use(contextName: string): Promise<void> {
        const useCmd: string = `docker context use ${contextName}`;
        await spawnAsync(useCmd, ContextCmdExecOptions);
        this.expediteContextCheck();
    }

    public async remove(contextName: string): Promise<void> {
        const removeCmd: string = `docker context rm ${contextName}`;
        await spawnAsync(removeCmd, ContextCmdExecOptions);
    }

    private async getDockerConfigDigest(): Promise<string> {
        // Note: computing Docker config file digest may fail, typically because Docker is not installed,
        // and there is no config file. We use falsy value (empty string) as a way to indicate that,
        // as opposed to rejecting the promise with the captured error.
        // This is a clue to the caller that they should go ahead and try to inspect the actual Docker context.

        return new Promise<string>((resolve, reject) => {
            try {
                // tslint:disable-next-line: non-literal-fs-path
                const dockerConfig = fs.createReadStream(DockerConfigFilePath);
                let hash = crypto.createHash('sha256');
                hash = dockerConfig.pipe(hash, { end: false });

                dockerConfig.on('end', () => {
                    try {
                        const digest = hash.digest('hex');
                        resolve(digest);
                    } catch (ex) {
                        resolve('');
                    }
                });

                dockerConfig.on('error', _ => {
                    resolve('');
                })
            } catch (ex) {
                resolve('');
            }
        });
    }

    private async refreshCachedDockerContext(): Promise<boolean> {
        const currentContext = await this.inspectCurrentContext();

        const contextChanged = !this.cachedContext || currentContext.FullSpec !== this.cachedContext.FullSpec;

        if (contextChanged) {
            this.cachedContext = currentContext;
        }

        return contextChanged;
    }

    private async inspectCurrentContext(): Promise<IDockerContext> {
        let execResult: {
            stdout: string;
        };
        const inspectCmd = `docker context inspect ${process.env[DOCKER_CONTEXT] || ''}`.trim();

        try {
            execResult = await execAsync(inspectCmd, ContextCmdExecOptions);
        } catch (err) {
            const error = parseError(err);
            throw new Error(localize('vscode-docker.dockerContext.inspectCurrentFailed', 'Could not determine the current Docker context. Is Docker installed? Error: {0}', error.message));
        }

        const dockerContexts = <IDockerContext[]>JSON.parse(execResult.stdout);
        if (!dockerContexts?.[0]) {
            throw new Error(localize('vscode-docker.dockerContext.contextCouldNotBeParsed', 'Docker context could not be parsed: {0}', execResult.stdout));
        }

        let currentContext = dockerContexts[0];
        currentContext.FullSpec = execResult.stdout;
        try {
            currentContext.HostProtocol = url.parse(currentContext.Endpoints.docker.Host).protocol?.replace(':', '')
        } catch { }
        return currentContext;
    }
}

export const dockerContextManager = new DockerContextManager();

