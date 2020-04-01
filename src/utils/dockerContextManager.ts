/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExecOptions } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as url from 'url';
import { workspace, WorkspaceConfiguration } from 'vscode';
import { parseError } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { LocalOSProvider } from './LocalOSProvider';
import { execAsync } from './spawnAsync';
import { timeUtils } from './timeUtils';

const ContextInspectExecOptions: ExecOptions = { timeout: 5000 }
const DOCKER_CONTEXT: string = 'DOCKER_CONTEXT';
const DefaultRefreshIntervalSec: number = 20;
const osp = new LocalOSProvider();
const DockerConfigFilePath: string = osp.pathJoin(osp.os, osp.homedir, '.docker', 'config.json');


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
    Context: IDockerContext,
    Changed: boolean
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

        if (!this.cachedContext || (Date.now() - this.lastContextCheckTimestamp > this.contextRefreshIntervalMs)) {
            try {
                if (!this.cachedContext) {
                    // First-time check
                    this.lastDockerConfigDigest = await this.getDockerConfigDigest();
                    contextChanged = await this.refreshCachedDockerContext();
                } else {
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
        const { Result: currentContext, DurationMs: duration } = await timeUtils.timeIt(async () => this.inspectCurrentContext());

        const contextChanged = !this.cachedContext || currentContext.FullSpec !== this.cachedContext.FullSpec;

        if (contextChanged) {
            const previousContext = this.cachedContext;
            this.cachedContext = currentContext;
            this.sendDockerContextEvent(currentContext, previousContext, duration);
        }

        return contextChanged;
    }

    private async inspectCurrentContext(): Promise<IDockerContext> {
        let execResult: {
            stdout: string;
        };
        const inspectCmd = `docker context inspect ${process.env[DOCKER_CONTEXT] || ''}`.trim();

        try {
            execResult = await execAsync(inspectCmd, ContextInspectExecOptions);
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

    private sendDockerContextEvent(currentContext: IDockerContext, previousContext: IDockerContext, contextRetrievalTimeMs: number): void {
        const eventName: string = previousContext ? 'docker-context.change' : 'docker-context.initialize';
        ext.reporter.sendTelemetryEvent(eventName, { hostProtocol: currentContext.HostProtocol }, { contextRetrievalTimeMs: contextRetrievalTimeMs });
    }
}

export const dockerContextManager = new DockerContextManager();

