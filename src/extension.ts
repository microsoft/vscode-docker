/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as Dockerode from 'dockerode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { CoreOptions } from 'request';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { registerAppServiceExtensionVariables } from 'vscode-azureappservice';
import { AzureUserInput, callWithTelemetryAndErrorHandling, createTelemetryReporter, IActionContext, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/lib/main';
import { registerCommands } from './commands/registerCommands';
import { consolidateDefaultRegistrySettings } from './commands/registries/registrySettings';
import { DockerDebugConfigProvider } from './configureWorkspace/DockerDebugConfigProvider';
import { COMPOSE_FILE_GLOB_PATTERN, ignoreBundle } from './constants';
import { registerDebugConfigurationProvider } from './debugging/coreclr/registerDebugConfigurationProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DockerComposeHoverProvider } from './dockerCompose/dockerComposeHoverProvider';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import { ext } from './extensionVariables';
import { registerTrees } from './tree/registerTrees';
import { addDockerSettingsToEnv } from './utils/addDockerSettingsToEnv';
import { addUserAgent } from './utils/addUserAgent';
import { getTrustedCertificates } from './utils/getTrustedCertificates';
import { Keytar } from './utils/keytar';
import { DefaultTerminalProvider } from './utils/TerminalProvider';
import { wrapError } from './utils/wrapError';

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

    ext.outputChannel = vscode.window.createOutputChannel("Docker");
    ctx.subscriptions.push(ext.outputChannel);

    if (!ext.terminalProvider) {
        ext.terminalProvider = new DefaultTerminalProvider();
    }
    ext.reporter = createTelemetryReporter(ctx);
    if (!ext.keytar) {
        ext.keytar = Keytar.tryCreate();
    }

    registerUIExtensionVariables(ext);
    registerAppServiceExtensionVariables(ext);
}

export async function activateInternal(ctx: vscode.ExtensionContext, perfStats: { loadStartTime: number, loadEndTime: number | undefined }): Promise<void> {
    perfStats.loadEndTime = Date.now();

    initializeExtensionVariables(ctx);
    await setRequestDefaults();
    await callWithTelemetryAndErrorHandling('docker.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

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

        registerTrees();
        registerCommands();

        ctx.subscriptions.push(
            vscode.debug.registerDebugConfigurationProvider(
                'docker',
                new DockerDebugConfigProvider()
            )
        );
        registerDebugConfigurationProvider(ctx);

        refreshDockerode();

        await consolidateDefaultRegistrySettings();
        activateLanguageClient();
    });
}

async function setRequestDefaults(): Promise<void> {
    // Set up the user agent for all direct 'request' calls in the extension (as long as they use ext.request)
    // ...  Trusted root certificate authorities
    let caList = await getTrustedCertificates();
    let defaultRequestOptions: CoreOptions = { agentOptions: { ca: caList } };
    // ... User agent
    addUserAgent(defaultRequestOptions);
    let requestWithDefaults = request.defaults(defaultRequestOptions);

    // Wrap 'get' to provide better error message for self-signed certificates
    let originalGet = <(...args: unknown[]) => request.RequestPromise>requestWithDefaults.get;
    // tslint:disable-next-line:no-any
    async function wrappedGet(this: unknown, ...args: unknown[]): Promise<any> {
        try {
            // tslint:disable-next-line: no-unsafe-any
            return await originalGet.call(this, ...args);
        } catch (err) {
            let error = <{ cause?: { code?: string } }>err;

            if (error && error.cause && error.cause.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                err = wrapError(err, `There was a problem verifying a certificate. This could be caused by a self-signed or corporate certificate. You may need to set the 'docker.importCertificates' setting to true.`)
            }

            throw err;
        }
    }

    // tslint:disable-next-line:no-any
    requestWithDefaults.get = <any>wrappedGet;

    ext.request = requestWithDefaults;
}

export async function deactivateInternal(): Promise<void> {
    if (!client) {
        return undefined;
    }
    // perform cleanup
    Configuration.dispose();
    return await client.stop();
}

namespace Configuration {
    let configurationListener: vscode.Disposable;

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

    export function initialize(): void {
        configurationListener = vscode.workspace.onDidChangeConfiguration(
            async (e: vscode.ConfigurationChangeEvent) => {
                // notify the language server that settings have change
                client.sendNotification(DidChangeConfigurationNotification.type, {
                    settings: null
                });

                // Update endpoint and refresh explorer if needed
                if (e.affectsConfiguration('docker')) {
                    refreshDockerode();
                    // tslint:disable-next-line: no-floating-promises
                    setRequestDefaults();
                }
            }
        );
    }

    export function dispose(): void {
        if (configurationListener) {
            // remove this listener when disposed
            configurationListener.dispose();
        }
    }
}

function activateLanguageClient(): void {
    // Don't wait
    callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
        context.telemetry.properties.isActivationEvent = 'true';
        let serverModule = ext.context.asAbsolutePath(
            path.join(
                ignoreBundle ? "node_modules" : "dist",
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
        // tslint:disable-next-line:no-floating-promises
        client.onReady().then(() => {
            // attach the VS Code settings listener
            Configuration.initialize();
        });
        client.start();
    });
}

/**
 * Dockerode parses and handles the well-known `DOCKER_*` environment variables, but it doesn't let us pass those values as-is to the constructor
 * Thus we will temporarily update `process.env` and pass nothing to the constructor
 */
function refreshDockerode(): void {
    const oldEnv = process.env;
    try {
        process.env = { ...process.env }; // make a clone before we change anything
        addDockerSettingsToEnv(process.env, oldEnv);
        ext.dockerodeError = undefined;
        ext.dockerode = new Dockerode();
    } catch (error) {
        // This will be displayed in the tree
        ext.dockerodeError = error;
    } finally {
        process.env = oldEnv;
    }
}
