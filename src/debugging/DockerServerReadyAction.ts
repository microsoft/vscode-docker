/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//
// Adapted from: https://github.com/microsoft/vscode/blob/8827cf5a607b6ab7abf45817604bc21883314db7/extensions/debug-server-ready/src/extension.ts
//

import * as util from 'util';
import * as vscode from 'vscode';
import ChildProcessProvider from './coreclr/ChildProcessProvider';
import CliDockerClient from './coreclr/CliDockerClient';
import { ResolvedDebugConfiguration } from './DebugHelper';

// tslint:disable-next-line: no-any
const localize = (message: string, ...param: any[]): string => {
    return util.format(message, param);
}

const PATTERN = 'listening on.* (https?://\\S+|[0-9]+)'; // matches "listening on port 3000" or "Now listening on: https://localhost:5001"
const URI_FORMAT = 'http://localhost:%s';
// tslint:disable-next-line: no-invalid-template-strings
const WEB_ROOT = '${workspaceFolder}';

export class ServerReadyDetector extends vscode.Disposable {
    private static detectors: Map<vscode.DebugSession, ServerReadyDetector> = new Map<vscode.DebugSession, ServerReadyDetector>();

    private hasFired: boolean = false;
    private regexp: RegExp;
    private disposables: vscode.Disposable[] = [];

    public static start(session: vscode.DebugSession): ServerReadyDetector | undefined {
        const configuration = <ResolvedDebugConfiguration>session.configuration;
        if (configuration
            && configuration.dockerOptions
            && configuration.dockerOptions.dockerServerReadyAction) {
            let detector = ServerReadyDetector.detectors.get(session);
            if (!detector) {
                detector = new ServerReadyDetector(session);
                ServerReadyDetector.detectors.set(session, detector);
            }
            return detector;
        }
        return undefined;
    }

    public static stop(session: vscode.DebugSession): void {
        let detector = ServerReadyDetector.detectors.get(session);
        if (detector) {
            ServerReadyDetector.detectors.delete(session);
            detector.dispose();
        }
    }

    private constructor(private session: vscode.DebugSession) {
        super(() => this.internalDispose());

        const configuration = <ResolvedDebugConfiguration>session.configuration;

        this.regexp = new RegExp(
            (configuration
                && configuration.dockerOptions
                && configuration.dockerOptions.dockerServerReadyAction
                && configuration.dockerOptions.dockerServerReadyAction.pattern)
            || PATTERN,
            'i');
    }

    private internalDispose(): void {
        this.disposables.forEach(d => { d.dispose(); });
        this.disposables = [];
    }

    public detectPattern(s: string): void {

        if (!this.hasFired) {
            const matches = this.regexp.exec(s);
            if (matches && matches.length >= 1) {
                // tslint:disable-next-line: no-floating-promises
                this.openExternalWithString(this.session, matches.length > 1 ? matches[1] : '');
                this.hasFired = true;
                this.internalDispose();
            }
        }
    }

    private async openExternalWithString(session: vscode.DebugSession, captureString: string): Promise<void> {
        const configuration = <ResolvedDebugConfiguration>session.configuration;
        const args = configuration.dockerOptions.dockerServerReadyAction;
        const format = args.uriFormat || URI_FORMAT;

        if (captureString === '') {
            // nothing captured by reg exp -> use the uriFormat as the target url without substitution
            // verify that format does not contain '%s'
            if (format.indexOf('%s') >= 0) {
                const errMsg = localize('server.ready.nocapture.error', "Format uri ('{0}') uses a substitution placeholder but pattern did not capture anything.", format);
                vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
                return;
            }
            captureString = format;
        } else if (/^[0-9]+$/.test(captureString)) {
            // looks like a port number -> use the uriFormat and substitute a single "%s" with the port
            // verify that format only contains a single '%s'
            const s = format.split('%s');
            if (s.length !== 2) {
                const errMsg = localize('server.ready.placeholder.error', "Format uri ('{0}') must contain exactly one substitution placeholder.", format);
                vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
                return;
            }

            const dockerClient = new CliDockerClient(new ChildProcessProvider());
            const containerPort = Number.parseInt(captureString, 10);
            const hostPort = await dockerClient.getHostPort(configuration.dockerOptions.dockerServerReadyAction.containerName, containerPort);

            if (!hostPort) {
                throw new Error(`Could not determine host port mapped to container port ${containerPort} in container \'${configuration.dockerOptions.dockerServerReadyAction.containerName}\'.`);
            }

            captureString = util.format(format, hostPort);
        } else {
            const containerPort = this.getContainerPort(captureString);

            if (containerPort === undefined) {
                const errMsg = localize('server.ready.port.error', "Captured string ('{0}') must contain a port number.", captureString);
                vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
                return;
            }

            const containerProtocol = this.getContainerProtocol(captureString);
            const dockerClient = new CliDockerClient(new ChildProcessProvider());
            const hostPort = await dockerClient.getHostPort(configuration.dockerOptions.dockerServerReadyAction.containerName, containerPort);

            if (!hostPort) {
                throw new Error(`Could not determine host port mapped to container port ${containerPort} in container \'${configuration.dockerOptions.dockerServerReadyAction.containerName}\'.`);
            }

            captureString = util.format(format, containerProtocol, hostPort);
        }

        this.openExternalWithUri(session, captureString);
    }

    private getContainerProtocol(containerUrl: string): string {
        const httpsRegex = /https:\/\//i; // Matches https://

        return httpsRegex.test(containerUrl) ? 'https' : 'http'
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
                vscode.env.openExternal(vscode.Uri.parse(uri));
                break;
            case 'debugWithChrome':
                const remoteName = 'remoteName';
                if (vscode.env[remoteName] === 'wsl' || !!vscode.extensions.getExtension('msjsdiag.debugger-for-chrome')) {
                    vscode.debug.startDebugging(
                        session.workspaceFolder,
                        {
                            type: 'chrome',
                            name: 'Chrome Debug',
                            request: 'launch',
                            url: uri,
                            webRoot: args.webRoot || WEB_ROOT
                        });
                } else {
                    const errMsg = localize('server.ready.chrome.not.installed', "The action '{0}' requires the '{1}' extension.", 'debugWithChrome', 'Debugger for Chrome');
                    vscode.window.showErrorMessage(errMsg, { modal: true }).then(_ => undefined);
                }
                break;
            default:
            // not supported
        }
    }
}

export function registerServerReadyAction(context: vscode.ExtensionContext): void {

    context.subscriptions.push(vscode.debug.onDidTerminateDebugSession(session => {
        ServerReadyDetector.stop(session);
    }));

    const trackers = new Set<string>();

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('*', {
        resolveDebugConfiguration(_folder: vscode.WorkspaceFolder | undefined, debugConfiguration: ResolvedDebugConfiguration): vscode.DebugConfiguration {
            if (debugConfiguration && debugConfiguration.type && debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.dockerServerReadyAction) {
                if (!trackers.has(debugConfiguration.type)) {
                    trackers.add(debugConfiguration.type);
                    startTrackerForType(context, debugConfiguration.type);
                }
            }
            return debugConfiguration;
        }
    }));
}

function startTrackerForType(context: vscode.ExtensionContext, type: string): void {

    // scan debug console output for a PORT message
    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory(type, {
        createDebugAdapterTracker(session: vscode.DebugSession): vscode.DebugAdapterTracker {
            const detector = ServerReadyDetector.start(session);
            if (detector) {
                return {
                    // tslint:disable: no-unsafe-any
                    onDidSendMessage: m => {
                        if (m.type === 'event' && m.event === 'output' && m.body) {
                            switch (m.body.category) {
                                case 'console':
                                case 'stderr':
                                case 'stdout':
                                    if (m.body.output) {
                                        detector.detectPattern(m.body.output);
                                    }
                                    break;
                                default:
                            }
                        }
                    }
                    // tslint:enable: no-unsafe-any
                };
            }
            return undefined;
        }
    }));
}
