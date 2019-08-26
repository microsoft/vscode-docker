/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DebugAdapterTracker, DebugAdapterTrackerFactory, DebugSession, env, Uri } from 'vscode';
import { ChildProcessProvider } from './coreclr/ChildProcessProvider';
import { CliDockerClient, DockerClient } from './coreclr/CliDockerClient';
import { DockerServerReadyAction } from './DockerDebugConfigurationProvider';

const portRegex = /:([\d]+)(?![\]:\da-f])/i; // Matches :1234 etc., as long as the next character is not a :, ], another digit, or letter (keeps from confusing on IPv6 addresses)

export class DockerDebugAdapterTracker implements DebugAdapterTracker {
    private readonly dockerClient: DockerClient;
    private readonly patternRegex: RegExp;
    private readonly containerName: string;
    private launched: boolean = false;

    constructor(dockerServerReadyAction: DockerServerReadyAction) {
        this.patternRegex = new RegExp(dockerServerReadyAction.pattern, 'i');
        this.containerName = dockerServerReadyAction.containerName;
        this.dockerClient = new CliDockerClient(new ChildProcessProvider());
    }

    // tslint:disable: no-unsafe-any no-any
    public async onDidSendMessage(message: any): Promise<void> {
        if (!this.launched && message.type === 'event' && message.event === 'output' && message.body) {
            await this.detectMatch(message.body.output as string);
        }
    }
    // tslint:enable: no-unsafe-any no-any

    private async detectMatch(message: string): Promise<void> {
        const result: RegExpMatchArray = message ? message.match(this.patternRegex) : undefined;
        if (result && result.length > 1) {
            let url = await this.replaceContainerPortWithHostPort(result[1]);
            url = await this.replaceListenerHostWithLocalhost(url);
            this.launched = await env.openExternal(Uri.parse(url));
        }
    }

    private async replaceContainerPortWithHostPort(url: string): Promise<string | undefined> {
        const result = url.match(portRegex);

        if (result && result.length > 1) {
            const newPort = await this.dockerClient.getHostPort(this.containerName, result[1]);

            if (newPort) {
                return url.replace(portRegex, `:${newPort}`);
            }
        }

        return undefined;
    }

    private async replaceListenerHostWithLocalhost(url: string): Promise<string> {
        // TODO: This does not account for things like http://+:1234, etc.
        // TODO: Need more advanced logic
        return url.replace(/\[::\]|0.0.0.0/g, 'localhost')
    }
}

export class DockerDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {
    public async createDebugAdapterTracker(session: DebugSession): Promise<DebugAdapterTracker | undefined> {
        // tslint:disable-next-line: no-unsafe-any
        const dockerServerReadyAction: DockerServerReadyAction = session.configuration && session.configuration.dockerServerReadyAction || undefined;

        if (dockerServerReadyAction && dockerServerReadyAction.containerName && dockerServerReadyAction.pattern) {
            return new DockerDebugAdapterTracker(dockerServerReadyAction);
        }

        return undefined;
    }
}
