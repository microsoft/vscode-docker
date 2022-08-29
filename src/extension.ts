/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TelemetryEvent } from '@microsoft/compose-language-service/lib/client/TelemetryEvent';
import { IActionContext, UserCancelledError, callWithTelemetryAndErrorHandling, createAzExtOutputChannel, createExperimentationService, registerErrorHandler, registerEvent, registerReportIssueCommand, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import * as tas from 'vscode-tas-client';
import { registerCommands } from './commands/registerCommands';
import { registerDebugProvider } from './debugging/DebugHelper';
import { DockerContextManager } from './docker/ContextManager';
import { ContainerFilesProvider } from './docker/files/ContainerFilesProvider';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import { ext } from './extensionVariables';
import { registerTaskProviders } from './tasks/TaskHelper';
import { ActivityMeasurementService } from './telemetry/ActivityMeasurementService';
import { registerListeners } from './telemetry/registerListeners';
import { registerTrees } from './tree/registerTrees';
import { AzureAccountExtensionListener } from './utils/AzureAccountExtensionListener';
import { cryptoUtils } from './utils/cryptoUtils';
import { DocumentSettingsClientFeature } from './utils/DocumentSettingsClientFeature';
import { migrateOldEnvironmentSettingsIfNeeded } from './utils/migrateOldEnvironmentSettingsIfNeeded';
import { isLinux, isMac, isWindows } from './utils/osUtils';

export type KeyInfo = { [keyName: string]: string };

export interface ComposeVersionKeys {
    all: KeyInfo;
    v1: KeyInfo;
    v2: KeyInfo;
}

let dockerfileLanguageClient: LanguageClient;
let composeLanguageClient: LanguageClient;

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

        // Set up environment variables
        setEnvironmentVariableContributions(ctx);

        // All of these internally handle telemetry opt-in
        ext.activityMeasurementService = new ActivityMeasurementService(ctx.globalState);
        ext.experimentationService = await createExperimentationService(
            ctx,
            process.env.VSCODE_DOCKER_TEAM === '1' ? tas.TargetPopulation.Team : undefined // If VSCODE_DOCKER_TEAM isn't set, let @microsoft/vscode-azext-utils decide target population
        );

        // Disabled for now
        // (new SurveyManager()).activate();

        // Remove the "Report Issue" button from all error messages in favor of the command
        // TODO: use built-in issue reporter if/when support is added to include arbitrary info in addition to repro steps (which we would leave blank to force the user to type *something*)
        registerErrorHandler(ctx => ctx.errorHandling.suppressReportIssue = true);
        registerReportIssueCommand('vscode-docker.help.reportIssue');

        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                DOCUMENT_SELECTOR,
                new DockerfileCompletionItemProvider(),
                '.'
            )
        );

        ctx.subscriptions.push(ext.dockerContextManager = new DockerContextManager());
        // At initialization we need to force a refresh since the filesystem watcher would have no reason to trigger
        // No need to wait thanks to ContextLoadingClient
        void ext.dockerContextManager.refresh();

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

        activateDockerfileLanguageClient(ctx);
        activateComposeLanguageClient(ctx);

        registerListeners();
    });

    // If this call results in changes to the values, the settings listener set up below will automatically re-update
    void migrateOldEnvironmentSettingsIfNeeded();

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

        await Promise.all([
            dockerfileLanguageClient.stop(),
            composeLanguageClient.stop(),
        ]);
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
                    dockerfileLanguageClient.protocol2CodeConverter.asUri(item.scopeUri)
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
                void dockerfileLanguageClient.sendNotification(DidChangeConfigurationNotification.type, {
                    settings: null
                });

                // Reset extension environment variables contribution if needed
                if (e.affectsConfiguration('containers.environment')) {
                    setEnvironmentVariableContributions(ext.context);
                }

                // These settings will result in a need to change context that doesn't actually change the docker context
                // So, force a manual refresh so the settings get picked up
                if (e.affectsConfiguration('containers.environment') ||
                    e.affectsConfiguration('docker.dockerodeOptions') ||
                    e.affectsConfiguration('docker.dockerPath') ||
                    e.affectsConfiguration('docker.composeCommand')) {
                    await ext.dockerContextManager.refresh();
                }
            }
        ));
    }
}
/* eslint-enable @typescript-eslint/no-namespace, no-inner-declarations */

function setEnvironmentVariableContributions(ctx: vscode.ExtensionContext): void {
    const settingValue: NodeJS.ProcessEnv = vscode.workspace.getConfiguration('docker').get<NodeJS.ProcessEnv>('environment', {});

    ctx.environmentVariableCollection.clear();
    ctx.environmentVariableCollection.persistent = true;

    for (const key of Object.keys(settingValue)) {
        ctx.environmentVariableCollection.replace(key, settingValue[key]);
    }
}

function activateDockerfileLanguageClient(ctx: vscode.ExtensionContext): void {
    // Don't wait
    void callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';
        const serverModule = ctx.asAbsolutePath(
            path.join(
                "dist",
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

        dockerfileLanguageClient = new LanguageClient(
            "dockerfile-langserver",
            "Dockerfile Language Server",
            serverOptions,
            clientOptions
        );
        dockerfileLanguageClient.registerProposedFeatures();

        ctx.subscriptions.push(dockerfileLanguageClient);
        await dockerfileLanguageClient.start();
        Configuration.initialize(ctx);
    });
}

function activateComposeLanguageClient(ctx: vscode.ExtensionContext): void {
    // Don't wait
    void callWithTelemetryAndErrorHandling('docker.composelanguageclient.activate', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';

        const config = vscode.workspace.getConfiguration('docker');
        if (!config.get('enableDockerComposeLanguageService', true)) {
            throw new UserCancelledError('languageServiceDisabled');
        }

        const serverModule = ctx.asAbsolutePath(
            path.join(
                "dist",
                "compose-language-service",
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

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ language: 'dockercompose' }]
        };

        composeLanguageClient = new LanguageClient(
            "compose-language-service",
            "Docker Compose Language Server",
            serverOptions,
            clientOptions
        );
        composeLanguageClient.registerProposedFeatures();
        composeLanguageClient.registerFeature(new DocumentSettingsClientFeature(composeLanguageClient));

        registerEvent('compose-langserver-event', composeLanguageClient.onTelemetry, (context: IActionContext, evtArgs: TelemetryEvent) => {
            context.telemetry.properties.langServerEventName = evtArgs.eventName;
            context.telemetry.suppressAll = evtArgs.suppressAll;
            context.telemetry.suppressIfSuccessful = evtArgs.suppressIfSuccessful;

            Object.assign(context.telemetry.measurements, evtArgs.measurements);
            Object.assign(context.telemetry.properties, evtArgs.properties);
        });

        ctx.subscriptions.push(composeLanguageClient);
        await composeLanguageClient.start();
    });
}
