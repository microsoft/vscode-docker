/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { AzureUserInput, callWithTelemetryAndErrorHandling, createAzExtOutputChannel, createTelemetryReporter, IActionContext, registerUIExtensionVariables, UserCancelledError } from 'vscode-azureextensionui';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/lib/main';
import { registerCommands } from './commands/registerCommands';
import { LegacyDockerDebugConfigProvider } from './configureWorkspace/LegacyDockerDebugConfigProvider';
import { COMPOSE_FILE_GLOB_PATTERN } from './constants';
import { registerDebugConfigurationProvider } from './debugging/coreclr/registerDebugConfigurationProvider';
import { registerDebugProvider } from './debugging/DebugHelper';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DockerComposeHoverProvider } from './dockerCompose/dockerComposeHoverProvider';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import { ext } from './extensionVariables';
import { localize } from './localize';
import { registerListeners } from './registerListeners';
import { registerTaskProviders } from './tasks/TaskHelper';
import { registerActiveUseSurvey } from './telemetry/surveys/activeUseSurvey';
import { TelemetryPublisher } from './telemetry/TelemetryPublisher';
import { TelemetryReporterProxy } from './telemetry/TelemetryReporterProxy';
import { registerTrees } from './tree/registerTrees';
import { AzureAccountExtensionListener } from './utils/AzureAccountExtensionListener';
import { Keytar } from './utils/keytar';
import { refreshDockerode } from './utils/refreshDockerode';
import { DefaultTerminalProvider } from './utils/TerminalProvider';

export type KeyInfo = { [keyName: string]: string };

export interface ComposeVersionKeys {
    All: KeyInfo;
    v1: KeyInfo;
    v2: KeyInfo;
}

let client: LanguageClient;

const DOCUMENT_SELECTOR: DocumentSelector = [
    { language: 'dockerfile', scheme: 'file' }
];

function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
    if (!ext.ui) {
        // This allows for standard interactions with the end user (as opposed to test input)
        ext.ui = new AzureUserInput(ctx.globalState);
    }
    ext.context = ctx;

    ext.outputChannel = createAzExtOutputChannel('Docker', ext.prefix);
    ctx.subscriptions.push(ext.outputChannel);

    if (!ext.terminalProvider) {
        ext.terminalProvider = new DefaultTerminalProvider();
    }

    const publisher = new TelemetryPublisher();
    ctx.subscriptions.push(publisher);

    ctx.subscriptions.push(registerActiveUseSurvey(publisher, ctx.globalState));

    ext.reporter = new TelemetryReporterProxy(publisher, createTelemetryReporter(ctx));
    if (!ext.keytar) {
        ext.keytar = Keytar.tryCreate();
    }

    registerUIExtensionVariables(ext);
}

export async function activateInternal(ctx: vscode.ExtensionContext, perfStats: { loadStartTime: number, loadEndTime: number | undefined }): Promise<void> {
    perfStats.loadEndTime = Date.now();

    initializeExtensionVariables(ctx);
    await callWithTelemetryAndErrorHandling('docker.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        validateOldPublisher(activateContext);

        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                DOCUMENT_SELECTOR,
                new DockerfileCompletionItemProvider(),
                '.'
            )
        );

        const YAML_MODE_ID: vscode.DocumentFilter = {
            language: 'yaml',
            scheme: 'file',
            pattern: COMPOSE_FILE_GLOB_PATTERN
        };
        let yamlHoverProvider = new DockerComposeHoverProvider(
            new DockerComposeParser(),
            composeVersionKeys.All
        );
        ctx.subscriptions.push(
            vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider)
        );
        ctx.subscriptions.push(
            vscode.languages.registerCompletionItemProvider(
                YAML_MODE_ID,
                new DockerComposeCompletionItemProvider(),
                "."
            )
        );

        await refreshDockerode();

        registerTrees();
        registerCommands();

        ctx.subscriptions.push(
            vscode.debug.registerDebugConfigurationProvider(
                'docker-node',
                new LegacyDockerDebugConfigProvider()
            )
        );
        registerDebugConfigurationProvider(ctx);

        registerDebugProvider(ctx);
        registerTaskProviders(ctx);

        activateLanguageClient(ctx);

        registerListeners(ctx);

        // NOTE: Temporarily disabled.
        // Don't wait
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        // nps(ctx.globalState);
    });
}

export async function deactivateInternal(ctx: vscode.ExtensionContext): Promise<void> {
    await callWithTelemetryAndErrorHandling('docker.deactivate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        AzureAccountExtensionListener.dispose();
    });
}

/**
 * Workaround for https://github.com/microsoft/vscode/issues/76211 (only necessary if people are on old versions of VS Code that don't have the fix)
 */
function validateOldPublisher(activateContext: IActionContext): void {
    const extension = vscode.extensions.getExtension('PeterJausovec.vscode-docker');
    if (extension) {
        let message: string = localize('vscode-docker.extension.pleaseReload', 'Please reload Visual Studio Code to complete updating the Docker extension.');
        let reload: vscode.MessageItem = { title: localize('vscode-docker.extension.reloadNow', 'Reload Now') };
        // Don't wait
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        ext.ui.showWarningMessage(message, reload).then(async result => {
            if (result === reload) {
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });

        activateContext.telemetry.properties.cancelStep = 'oldPublisherInstalled';
        throw new UserCancelledError();
    }
}

namespace Configuration {
    export function computeConfiguration(params: ConfigurationParams): vscode.WorkspaceConfiguration[] {
        let result: vscode.WorkspaceConfiguration[] = [];
        for (let item of params.items) {
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

                // Refresh explorer if needed
                if (e.affectsConfiguration('docker.host') ||
                    e.affectsConfiguration('docker.certPath') ||
                    e.affectsConfiguration('docker.tlsVerify') ||
                    e.affectsConfiguration('docker.machineName')) {
                    await refreshDockerode();
                }
            }
        ));
    }
}

function activateLanguageClient(ctx: vscode.ExtensionContext): void {
    // Don't wait
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';
        let serverModule = ext.context.asAbsolutePath(
            path.join(
                ext.ignoreBundle ? "node_modules" : "dist",
                "dockerfile-language-server-nodejs",
                "lib",
                "server.js"
            )
        );
        assert(true === await fse.pathExists(serverModule), "Could not find language client module");

        let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

        let serverOptions: ServerOptions = {
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

        let middleware: Middleware = {
            workspace: {
                configuration: Configuration.computeConfiguration
            }
        };

        let clientOptions: LanguageClientOptions = {
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
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        client.onReady().then(() => {
            // attach the VS Code settings listener
            Configuration.initialize(ctx);
        });

        ctx.subscriptions.push(client.start());
    });
}
