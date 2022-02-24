/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//
// Adapted from: https://github.com/microsoft/vscode/blob/8827cf5a607b6ab7abf45817604bc21883314db7/extensions/debug-server-ready/src/extension.ts
//

import * as util from 'util';
import * as vscode from 'vscode';
import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { ResolvedDebugConfiguration } from './DebugHelper';

const PATTERN = 'listening on.* (https?://\\S+|[0-9]+)'; // matches "listening on port 3000" or "Now listening on: https://localhost:5001"
const URI_FORMAT = 'http://localhost:%s';
/* eslint-disable-next-line no-template-curly-in-string */
const WEB_ROOT = '${workspaceFolder}';

class ServerReadyDetector implements DockerServerReadyDetector {
    private hasFired: boolean = false;
    private regexp: RegExp;

    public constructor(private session: vscode.DebugSession) {
        const configuration = <ResolvedDebugConfiguration>session.configuration;

        this.regexp = new RegExp(
            (configuration?.dockerOptions?.dockerServerReadyAction?.pattern)
            || PATTERN,
            'i');
    }

    public detectPattern(s: string): boolean {
        if (!this.hasFired) {
            const matches = this.regexp.exec(s);
            if (matches && matches.length >= 1) {
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                this.openExternalWithString(this.session, matches.length > 1 ? matches[1] : '');
                this.hasFired = true;
            }
        }

        return this.hasFired;
    }

    private async openExternalWithString(session: vscode.DebugSession, captureString: string): Promise<void> {
        const configuration = <ResolvedDebugConfiguration>session.configuration;
        const args = configuration.dockerOptions.dockerServerReadyAction;
        const format = args.uriFormat || URI_FORMAT;

        if (!args || !args.containerName) {
            throw new Error(localize('vscode-docker.debug.serverReady.noContainer', 'No container name was resolved or provided to DockerServerReadyAction.'));
        }

        await callWithTelemetryAndErrorHandling('dockerServerReadyAction.serverReadyDetector.openExternalWithString', async (context: IActionContext) => {
            // Don't actually telemetrize or show anything (same as prior behavior), but wrap call to get an IActionContext
            context.telemetry.suppressAll = true;
            context.errorHandling.suppressDisplay = true;
            context.errorHandling.rethrow = false;

            if (captureString === '') {
                // nothing captured by reg exp -> use the uriFormat as the target url without substitution
                // verify that format does not contain '%s'
                if (format.indexOf('%s') >= 0) {
                    const errMsg = localize('vscode-docker.debug.serverReady.noCapture', 'Format uri (\'{0}\') uses a substitution placeholder but pattern did not capture anything.', format);
                    void vscode.window.showErrorMessage(errMsg, { modal: true });
                    return;
                }
                captureString = format;
            } else if (/^[0-9]+$/.test(captureString)) {
                // looks like a port number -> use the uriFormat and substitute a single "%s" with the port
                // verify that format only contains a single '%s'
                const s = format.split('%s');
                if (s.length !== 2) {
                    const errMsg = localize('vscode-docker.debug.serverReady.oneSubstitution', 'Format uri (\'{0}\') must contain exactly one substitution placeholder.', format);
                    void vscode.window.showErrorMessage(errMsg, { modal: true });
                    return;
                }

                const containerPort = Number.parseInt(captureString, 10);
                const containerInspectInfo = await ext.dockerClient.inspectContainer(context, args.containerName);
                const hostPort = containerInspectInfo.NetworkSettings.Ports[`${containerPort}/tcp`][0].HostPort;

                if (!hostPort) {
                    throw new Error(localize('vscode-docker.debug.serverReady.noHostPortA', 'Could not determine host port mapped to container port {0} in container \'{1}\'.', containerPort, args.containerName));
                }

                captureString = util.format(format, hostPort);
            } else {
                const containerPort = this.getContainerPort(captureString);

                if (containerPort === undefined) {
                    const errMsg = localize('vscode-docker.debug.serverReady.noCapturedPort', 'Captured string (\'{0}\') must contain a port number.', captureString);
                    void vscode.window.showErrorMessage(errMsg, { modal: true });
                    return;
                }

                const containerProtocol = this.getContainerProtocol(captureString);
                const containerInspectInfo = await ext.dockerClient.inspectContainer(context, args.containerName);
                const hostPort = containerInspectInfo.NetworkSettings.Ports[`${containerPort}/tcp`][0].HostPort;

                if (!hostPort) {
                    throw new Error(localize('vscode-docker.debug.serverReady.noHostPortB', 'Could not determine host port mapped to container port {0} in container \'{1}\'.', containerPort, args.containerName));
                }

                const s = format.split('%s');

                if (s.length === 1) {
                    // Format string has no substitutions, so use as-is...
                    captureString = format;
                } else if (s.length === 3) {
                    // There are exactly two substitutions (which is expected)...
                    captureString = util.format(format, containerProtocol, hostPort);
                } else {
                    const errMsg = localize('vscode-docker.debug.serverReady.twoSubstitutions', 'Format uri (\'{0}\') must contain exactly two substitution placeholders.', format);
                    void vscode.window.showErrorMessage(errMsg, { modal: true });
                    return;
                }
            }

            this.openExternalWithUri(session, captureString);
        });
    }

    private getContainerProtocol(containerUrl: string): string {
        const httpsRegex = /https:\/\//i; // Matches https://

        return httpsRegex.test(containerUrl) ? 'https' : 'http';
    }

    private getContainerPort(containerUrl: string): number | undefined {
        const portRegex = /:([\d]+)(?![\]:\da-f])/i;
        const result = containerUrl.match(portRegex);

        if (result && result.length > 1) {
            return Number.parseInt(result[1], 10);
        }

        return undefined;
    }

    private openExternalWithUri(session: vscode.DebugSession, uri: string): void {

        const configuration = <ResolvedDebugConfiguration>session.configuration;
        const args = configuration.dockerOptions.dockerServerReadyAction;
        switch (args.action || 'openExternally') {
            case 'openExternally':
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                vscode.env.openExternal(vscode.Uri.parse(uri));
                break;
            case 'debugWithChrome':
                if (vscode.env['remoteName'] === 'wsl' || !!vscode.extensions.getExtension('msjsdiag.debugger-for-chrome')) {
                    void vscode.debug.startDebugging(
                        session.workspaceFolder,
                        {
                            type: 'chrome',
                            name: 'Chrome Debug',
                            request: 'launch',
                            url: uri,
                            webRoot: args.webRoot || WEB_ROOT
                        });
                } else {
                    const errMsg = localize('vscode-docker.debug.serverReady.noChrome', 'The action \'debugWithChrome\' requires the \'Debugger for Chrome\' extension.');
                    void vscode.window.showErrorMessage(errMsg, { modal: true });
                }
                break;
            default:
            // not supported
        }
    }
}

type DebugAdapterMessage = {
    body?: {
        category?: string;
        output?: string;
    };
    type?: string;
    event?: string;
};

interface DockerServerReadyDetector {
    detectPattern(output: string): void;
}

type LogStream = NodeJS.ReadableStream & { destroy(): void; };

class DockerLogsTracker extends vscode.Disposable {
    private logStream: LogStream;

    public constructor(private readonly containerName: string, private readonly detector: DockerServerReadyDetector) {
        super(
            () => {
                if (this.logStream) {
                    this.logStream.destroy();
                }
            });

        if (!this.detector) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.startListening();
    }

    private async startListening(): Promise<void> {
        return callWithTelemetryAndErrorHandling('dockerServerReadyAction.dockerLogsTracker.startListening', async (context: IActionContext) => {
            // Don't actually telemetrize or show anything (same as prior behavior), but wrap call to get an IActionContext
            context.telemetry.suppressAll = true;
            context.errorHandling.suppressDisplay = true;
            context.errorHandling.rethrow = false;

            this.logStream = await ext.dockerClient.getContainerLogs(context, this.containerName) as LogStream;

            this.logStream.on('data', (data) => {
                this.detector.detectPattern(data.toString());
            });
        });
    }
}

class DockerDebugAdapterTracker extends vscode.Disposable implements vscode.DebugAdapterTracker {
    public constructor(private readonly detector: DockerServerReadyDetector) {
        super(
            () => {
                // Stop responding to messages...
                this.onDidSendMessage = undefined;
            });
    }

    public onDidSendMessage(m: DebugAdapterMessage): void {
        if (m.type === 'event'
            && m.event === 'output'
            && m.body?.category
            && m.body?.output) {
            switch (m.body.category) {
                case 'console':
                case 'stderr':
                case 'stdout':
                    this.detector.detectPattern(m.body.output);
                    break;
                default:
            }
        }
    }
}

class MultiOutputDockerServerReadyManager extends vscode.Disposable implements DockerServerReadyDetector {
    private readonly detector: ServerReadyDetector;
    private readonly logsTracker: DockerLogsTracker;
    public readonly tracker: DockerDebugAdapterTracker;

    public constructor(session: vscode.DebugSession) {
        super(
            () => {
                if (this.logsTracker) {
                    this.logsTracker.dispose();
                }

                this.tracker.dispose();
            });

        this.detector = new ServerReadyDetector(session);

        const configuration = <ResolvedDebugConfiguration>session.configuration;

        if (configuration?.dockerOptions?.dockerServerReadyAction?.containerName) {
            this.logsTracker = new DockerLogsTracker(configuration.dockerOptions.dockerServerReadyAction.containerName, this);
        }

        this.tracker = new DockerDebugAdapterTracker(this);
    }

    public detectPattern(output: string): void {
        if (this.detector.detectPattern(output)) {
            this.dispose();
        }
    }
}

class DockerDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
    private static trackers: Map<string, MultiOutputDockerServerReadyManager> = new Map<string, MultiOutputDockerServerReadyManager>();

    public static start(session: vscode.DebugSession): DockerDebugAdapterTracker | undefined {
        const configuration = <ResolvedDebugConfiguration>session.configuration;
        if (configuration?.dockerOptions?.dockerServerReadyAction) {
            const realSessionId = DockerDebugAdapterTrackerFactory.getRealSessionId(session);

            let tracker = DockerDebugAdapterTrackerFactory.trackers.get(realSessionId);
            if (!tracker) {
                tracker = new MultiOutputDockerServerReadyManager(session);
                DockerDebugAdapterTrackerFactory.trackers.set(realSessionId, tracker);
            }

            return tracker.tracker;
        }

        return undefined;
    }

    public static stop(session: vscode.DebugSession): void {
        const realSessionId = DockerDebugAdapterTrackerFactory.getRealSessionId(session);
        const tracker = DockerDebugAdapterTrackerFactory.trackers.get(realSessionId);

        if (tracker) {
            DockerDebugAdapterTrackerFactory.trackers.delete(realSessionId);
            tracker.dispose();
        }
    }

    private static getRealSessionId(session: vscode.DebugSession): string {
        // If the session configuration has the property `__sessionId`, that ID is the _parent_ session ID, and the one we actually want
        // This way, only one tracker gets created per session (for the parent session)
        return session.configuration?.__sessionId as string || session.id;
    }

    public createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return DockerDebugAdapterTrackerFactory.start(session);
    }
}

class DockerServerReadyDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    private readonly trackers: Set<string> = new Set<string>();
    private readonly trackerFactory: DockerDebugAdapterTrackerFactory = new DockerDebugAdapterTrackerFactory();

    public constructor(private readonly context: vscode.ExtensionContext) {
    }

    public resolveDebugConfiguration?(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: ResolvedDebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        if (debugConfiguration?.type && debugConfiguration?.dockerOptions?.dockerServerReadyAction) {
            if (!this.trackers.has(debugConfiguration.type)) {
                this.context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory(debugConfiguration.type, this.trackerFactory));
                this.trackers.add(debugConfiguration.type);
            }
        }

        return debugConfiguration;
    }
}

export function registerServerReadyAction(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(session => {
        DockerDebugAdapterTrackerFactory.stop(session);
    }));

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('*', new DockerServerReadyDebugConfigurationProvider(context)));
}
