/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as util from 'util';
import { DebugAdapterTracker, DebugAdapterTrackerFactory, DebugSession, env, Uri } from 'vscode';
import { ChildProcessProvider } from './coreclr/ChildProcessProvider';
import { CliDockerClient, DockerClient } from './coreclr/CliDockerClient';
import { ResolvedDebugConfiguration } from './DebugHelper';
import { DockerServerReadyAction } from './DockerDebugConfigurationBase';

const portRegex = /:([\d]+)(?![\]:\da-f])/i; // Matches :1234 etc., as long as the next character is not a :, ], another digit, or letter (keeps from confusing on IPv6 addresses)
const httpsRegex = /https:\/\//i; // Matches https://

export class DockerDebugAdapterTracker implements DebugAdapterTracker {
    private readonly dockerClient: DockerClient;
    private readonly patternRegex: RegExp;
    private readonly containerName: string;
    private readonly uriFormat: string;
    private matched: boolean = false;

    constructor(dockerServerReadyAction: DockerServerReadyAction) {
        this.patternRegex = new RegExp(dockerServerReadyAction.pattern, 'i');
        this.containerName = dockerServerReadyAction.containerName;
        this.uriFormat = dockerServerReadyAction.uriFormat || '%s://localhost%s';
        this.dockerClient = new CliDockerClient(new ChildProcessProvider());
    }

    // tslint:disable: no-unsafe-any no-any
    public async onDidSendMessage(message: any): Promise<void> {
        if (!this.matched && message.type === 'event' && message.event === 'output' && message.body) {
            await this.detectMatch(message.body.output as string);
        }
    }
    // tslint:enable: no-unsafe-any no-any

    private async detectMatch(message: string): Promise<void> {
        const result: RegExpMatchArray = message ? message.match(this.patternRegex) : undefined;
        if (result && result.length > 1) {
            this.matched = true;

            // Do not wait
            // tslint:disable-next-line: no-floating-promises
            this.getHostPort(result[1]).then(async hostPort => {
                const protocol = DockerDebugAdapterTracker.getProtocol(result[1]);
                const url = util.format(this.uriFormat, protocol, hostPort);
                await env.openExternal(Uri.parse(url));
            });
        }
    }

    private async getHostPort(containerUrl: string): Promise<string | undefined> {
        const result = containerUrl.match(portRegex);

        if (result && result.length > 1) {
            const hostPort = await this.dockerClient.getHostPort(this.containerName, Number.parseInt(result[1], 10));
            if (hostPort) {
                return `:${hostPort}`;
            }
        }

        return '';
    }

    private static getProtocol(containerUrl: string): string {
        return httpsRegex.test(containerUrl) ? 'https' : 'http';
    }
}

export class DockerDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {
    public async createDebugAdapterTracker(session: DebugSession): Promise<DebugAdapterTracker | undefined> {
        const configuration = <ResolvedDebugConfiguration>session.configuration;
        const dockerServerReadyAction = configuration && configuration.dockerOptions && configuration.dockerOptions.dockerServerReadyAction || undefined;

        if (dockerServerReadyAction && dockerServerReadyAction.containerName && dockerServerReadyAction.pattern) {
            return new DockerDebugAdapterTracker(dockerServerReadyAction);
        }

        return undefined;
    }
}
