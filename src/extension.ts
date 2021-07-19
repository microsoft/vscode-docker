/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, createAzExtOutputChannel, createExperimentationService, IActionContext, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import * as tas from 'vscode-tas-client';
import { registerCommands } from './commands/registerCommands';
import { extensionVersion } from './constants';
import { registerDebugProvider } from './debugging/DebugHelper';
import { DockerContextManager } from './docker/ContextManager';
import { ContainerFilesProvider } from './docker/files/ContainerFilesProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DockerComposeHoverProvider } from './dockerCompose/dockerComposeHoverProvider';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import { ext } from './extensionVariables';
import { registerTaskProviders } from './tasks/TaskHelper';
import { ActivityMeasurementService } from './telemetry/ActivityMeasurementService';
import { registerListeners } from './telemetry/registerListeners';
import { registerTrees } from './tree/registerTrees';
import { AzureAccountExtensionListener } from './utils/AzureAccountExtensionListener';
import { cryptoUtils } from './utils/cryptoUtils';
import { isLinux, isMac, isWindows } from './utils/osUtils';

export type KeyInfo = { [keyName: string]: string };

export interface ComposeVersionKeys {
    all: KeyInfo;
    v1: KeyInfo;
    v2: KeyInfo;
}

let client: LanguageClient;

const DOCUMENT_SELECTOR: DocumentSelector = [
    { language: 'dockerfile', scheme: 'file' }
];

function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
    ext.context = ctx;

    ext.outputChannel = createAzExtOutputChannel('Docker', ext.prefix);
    ctx.subscriptions.push(ext.outputChannel);

    registerUIExtensionVariables(ext);
}

export async function activateInternal(ctx: vscode.ExtensionContext, perfStats: { loadStartTime: number, loadEndTime: number | undefined }): Promise<unknown | undefined> {
    perfStats.loadEndTime = Date.now();

    initializeExtensionVariables(ctx);

    await callWithTelemetryAndErrorHandling('docker.activate', async (activateContext: IActionContext) => {
        activateContext.errorHandling.rethrow = true;
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;
        activateContext.telemetry.properties.dockerInstallationIDHash = await getDockerInstallationIDHash();

        // All of these internally handle telemetry opt-in
        ext.activityMeasurementService = new ActivityMeasurementService(ctx.globalState);

        let targetPopulation: tas.TargetPopulation;
        if (process.env.DEBUGTELEMETRY || process.env.VSCODE_DOCKER_TEAM === '1') {
            targetPopulation = tas.TargetPopulation.Team;
        } else if (/alpha/ig.test(extensionVersion.value)) {
            targetPopulation = tas.TargetPopulation.Insiders;
        } else {
            targetPopulation = tas.TargetPopulation.Public;
        }
        ext.experimentationService = await createExperimentationService(ctx, targetPopulation);

        // Temporarily disabled--reenable if we need to do any surveys
        // (new SurveyManager()).activate();

        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                DOCUMENT_SELECTOR,
                new DockerfileCompletionItemProvider(),
                '.'
            )
        );

        const COMPOSE_MODE_ID: vscode.DocumentFilter = {
            language: 'dockercompose',
            scheme: 'file',
        };
        const composeHoverProvider = new DockerComposeHoverProvider(
            new DockerComposeParser(),
            composeVersionKeys.all
        );
        ctx.subscriptions.push(
            vscode.languages.registerHoverProvider(COMPOSE_MODE_ID, composeHoverProvider)
        );
        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                COMPOSE_MODE_ID,
                new DockerComposeCompletionItemProvider(),
                "."
            )
        );

        ctx.subscriptions.push(ext.dockerContextManager = new DockerContextManager());
        // At initialization we need to force a refresh since the filesystem watcher would have no reason to trigger
        await ext.dockerContextManager.refresh();

        ctx.subscriptions.push(
            vscode.workspace.registerFileSystemProvider(
                'docker',
                new ContainerFilesProvider(() => ext.dockerClient),
                {
                    // While Windows containers aren't generally case-sensitive, Linux containers are and make up the overwhelming majority of running containers.
                    isCaseSensitive: true,
                    isReadonly: false
                })
        );

        registerTrees();
        registerCommands();

        registerDebugProvider(ctx);
        registerTaskProviders(ctx);

        activateLanguageClient(ctx);

        registerListeners();
    });

    // If the magic VSCODE_DOCKER_TEAM environment variable is set to 1, export the mementos for use by the Memento Explorer extension
    if (process.env.VSCODE_DOCKER_TEAM === '1') {
        return {
            memento: {
                globalState: ctx.globalState,
                workspaceState: ctx.workspaceState,
            },
        };
    } else {
        return undefined;
    }
}

export async function deactivateInternal(ctx: vscode.ExtensionContext): Promise<void> {
    await callWithTelemetryAndErrorHandling('docker.deactivate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        AzureAccountExtensionListener.dispose();
    });
}

async function getDockerInstallationIDHash(): Promise<string> {
    try {
        if (!isLinux()) {
            const cached = ext.context.globalState.get<string | undefined>('docker.installIdHash', undefined);

            if (cached) {
                return cached;
            }

            let installIdFilePath: string | undefined;
            if (isWindows() && process.env.APPDATA) {
                installIdFilePath = path.join(process.env.APPDATA, 'Docker', '.trackid');
            } else if (isMac()) {
                installIdFilePath = path.join(os.homedir(), 'Library', 'Group Containers', 'group.com.docker', 'userId');
            }

            // Sync is intentionally used for performance, this is on the activation code path
            if (installIdFilePath && fse.pathExistsSync(installIdFilePath)) {
                let result = fse.readFileSync(installIdFilePath, 'utf-8');
                result = cryptoUtils.hashString(result);
                await ext.context.globalState.update('docker.installIdHash', result);
                return result;
            }
        }
    } catch {
        // Best effort
    }

    return 'unknown';
}

/* eslint-disable @typescript-eslint/no-namespace, no-inner-declarations */
namespace Configuration {
    export function computeConfiguration(params: ConfigurationParams): vscode.WorkspaceConfiguration[] {
        const result: vscode.WorkspaceConfiguration[] = [];
        for (const item of params.items) {
            let config: vscode.WorkspaceConfiguration;

            if (item.scopeUri) {
                config = vscode.workspace.getConfiguration(
                    item.section,
                    client.protocol2CodeConverter.asUri(item.scopeUri)
                );
            } else {
                config = vscode.workspace.getConfiguration(item.section);
            }
            result.push(config);
        }
        return result;
    }

    export function initialize(ctx: vscode.ExtensionContext): void {
        ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(
            async (e: vscode.ConfigurationChangeEvent) => {
                // notify the language server that settings have change
                client.sendNotification(DidChangeConfigurationNotification.type, {
                    settings: null
                });

                // These settings will result in a need to change context that doesn't actually change the docker context
                // So, force a manual refresh so the settings get picked up
                if (e.affectsConfiguration('docker.host') ||
                    e.affectsConfiguration('docker.context') ||
                    e.affectsConfiguration('docker.certPath') ||
                    e.affectsConfiguration('docker.tlsVerify') ||
                    e.affectsConfiguration('docker.machineName') ||
                    e.affectsConfiguration('docker.dockerodeOptions')) {
                    await ext.dockerContextManager.refresh();
                }
            }
        ));
    }
}
/* eslint-enable @typescript-eslint/no-namespace, no-inner-declarations */

function activateLanguageClient(ctx: vscode.ExtensionContext): void {
    // Don't wait
    void callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';
        const serverModule = ext.context.asAbsolutePath(
            path.join(
                ext.ignoreBundle ? "node_modules" : "dist",
                "dockerfile-language-server-nodejs",
                "lib",
                "server.js"
            )
        );

        const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

        const serverOptions: ServerOptions = {
            run: {
                module: serverModule,
                transport: TransportKind.ipc,
                args: ["--node-ipc"]
            },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };

        const middleware: Middleware = {
            workspace: {
                configuration: Configuration.computeConfiguration
            }
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: DOCUMENT_SELECTOR,
            synchronize: {
                fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
            },
            middleware: middleware
        };

        client = new LanguageClient(
            "dockerfile-langserver",
            "Dockerfile Language Server",
            serverOptions,
            clientOptions
        );
        client.registerProposedFeatures();
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        client.onReady().then(() => {
            // attach the VS Code settings listener
            Configuration.initialize(ctx);
        });

        ctx.subscriptions.push(client.start());
    });
}
