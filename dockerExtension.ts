/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { DockerHoverProvider } from './dockerHoverProvider';
import { DockerfileCompletionItemProvider } from './dockerfile/dockerfileCompletionItemProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DOCKERFILE_KEY_INFO } from './dockerfile/dockerfileKeyInfo';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileParser } from './dockerfile/dockerfileParser';
import vscode = require('vscode');
import { buildImage } from './commands/build-image';
import inspectImageCommand from './commands/inspect-image';
import { removeImage } from './commands/remove-image';
import { pushImage } from './commands/push-image';
import { startContainer, startContainerInteractive, startAzureCLI } from './commands/start-container';
import { stopContainer } from './commands/stop-container';
import { showLogsContainer } from './commands/showlogs-container';
import { openShellContainer } from './commands/open-shell-container';
import { tagImage } from './commands/tag-image';
import { composeUp, composeDown } from './commands/docker-compose';
import { configure, configureLaunchJson } from './configureWorkspace/configure';
import { scheduleValidate } from './linting/dockerLinting';
import { systemPrune } from './commands/system-prune';
import { Reporter } from './telemetry/telemetry';
import DockerInspectDocumentContentProvider, { SCHEME as DOCKER_INSPECT_SCHEME } from './documentContentProviders/dockerInspect';
import { DockerExplorerProvider } from './explorer/dockerExplorer';
import { removeContainer } from './commands/remove-container';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

export const FROM_DIRECTIVE_PATTERN = /^\s*FROM\s*([\w-\/:]*)(\s*AS\s*[a-z][a-z0-9-_\\.]*)?$/i;
export const COMPOSE_FILE_GLOB_PATTERN = '**/[dD]ocker-[cC]ompose*.{yaml,yml}';
export const DOCKERFILE_GLOB_PATTERN = '**/[dD]ocker[fF]ile*';

export var diagnosticCollection: vscode.DiagnosticCollection;
export var dockerExplorerProvider: DockerExplorerProvider;

export type KeyInfo = { [keyName: string]: string; };

export interface ComposeVersionKeys {
    All: KeyInfo,
    v1: KeyInfo,
    v2: KeyInfo
};

export function activate(ctx: vscode.ExtensionContext): void {
    const DOCKERFILE_MODE_ID: vscode.DocumentFilter = { language: 'dockerfile', scheme: 'file' };
    
    ctx.subscriptions.push(new Reporter(ctx));


    dockerExplorerProvider = new DockerExplorerProvider();
    vscode.window.registerTreeDataProvider('dockerExplorer', dockerExplorerProvider);
    vscode.commands.registerCommand('dockerExplorer.refreshExplorer', () => dockerExplorerProvider.refresh());
    vscode.commands.registerCommand('dockerExplorer.systemPrune', () => systemPrune());

    var dockerHoverProvider = new DockerHoverProvider(new DockerfileParser(), DOCKERFILE_KEY_INFO);
    ctx.subscriptions.push(vscode.languages.registerHoverProvider(DOCKERFILE_MODE_ID, dockerHoverProvider));
    ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(DOCKERFILE_MODE_ID, new DockerfileCompletionItemProvider(), '.'));

    const YAML_MODE_ID: vscode.DocumentFilter = { language: 'yaml', scheme: 'file', pattern: COMPOSE_FILE_GLOB_PATTERN };
    var yamlHoverProvider = new DockerHoverProvider(new DockerComposeParser(), composeVersionKeys.All);
    ctx.subscriptions.push(vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider));
    ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(YAML_MODE_ID, new DockerComposeCompletionItemProvider(), '.'));
    
    ctx.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DOCKER_INSPECT_SCHEME, new DockerInspectDocumentContentProvider()));

    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.configure', configure));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.debug.configureLaunchJson', configureLaunchJson));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.build', buildImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.inspect', inspectImageCommand));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.remove', removeImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.push', pushImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.tag', tagImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.start', startContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.start.interactive', startContainerInteractive));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.start.azurecli', startAzureCLI));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.stop', stopContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.show-logs', showLogsContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.open-shell', openShellContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.remove', removeContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.compose.up', composeUp));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.compose.down', composeDown));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.system.prune', systemPrune));

    diagnosticCollection = vscode.languages.createDiagnosticCollection('docker-diagnostics');
    
	ctx.subscriptions.push(diagnosticCollection);

    vscode.workspace.onDidChangeTextDocument((e) => scheduleValidate(e.document), ctx.subscriptions);

    vscode.workspace.textDocuments.forEach((doc) => scheduleValidate(doc));
    vscode.workspace.onDidOpenTextDocument((doc) => scheduleValidate(doc), ctx.subscriptions);
    vscode.workspace.onDidCloseTextDocument((doc) => diagnosticCollection.delete(doc.uri), ctx.subscriptions);

    activateLanguageClient(ctx);
}

function activateLanguageClient(ctx: vscode.ExtensionContext) {
    let serverModule = ctx.asAbsolutePath(path.join("node_modules", "dockerfile-language-server-nodejs", "lib", "server.js"));
    let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc, args: ["--node-ipc"] },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    }

    let clientOptions: LanguageClientOptions = {
        documentSelector: ['dockerfile'],
        synchronize: {
            configurationSection: 'docker.languageserver',
            // detect configuration changes
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    }

    let disposable = new LanguageClient("dockerfile-langserver", "Dockerfile Language Server", serverOptions, clientOptions).start();
    ctx.subscriptions.push(disposable);
}
