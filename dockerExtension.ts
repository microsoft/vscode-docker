/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { DockerHoverProvider } from './dockerHoverProvider';
import { DockerfileCompletionItemProvider } from './dockerfile/dockerfileCompletionItemProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DOCKERFILE_KEY_INFO } from './dockerfile/dockerfileKeyInfo';
import { DOCKER_COMPOSE_KEY_INFO } from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileParser } from './dockerfile/dockerfileParser';
import vscode = require('vscode');
import { buildImage } from './commands/build-image';
import { removeImage } from './commands/remove-image';
import { pushImage } from './commands/push-image';
import { startContainer, startContainerInteractive } from './commands/start-container';
import { stopContainer } from './commands/stop-container';
import { showLogsContainer } from './commands/showlogs-container';
import { openShellContainer } from './commands/open-shell-container';
import { composeUp, composeDown } from './commands/docker-compose';
import { configure, configureLaunchJson } from './configureWorkspace/configure';

export function activate(ctx: vscode.ExtensionContext): void {
    const DOCKERFILE_MODE_ID: vscode.DocumentFilter = { language: 'dockerfile', scheme: 'file' };
    var dockerHoverProvider = new DockerHoverProvider(new DockerfileParser(), DOCKERFILE_KEY_INFO);
    ctx.subscriptions.push(vscode.languages.registerHoverProvider(DOCKERFILE_MODE_ID, dockerHoverProvider));
    ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(DOCKERFILE_MODE_ID, new DockerfileCompletionItemProvider(), '.'));

    const YAML_MODE_ID: vscode.DocumentFilter = { language: 'yaml', scheme: 'file', pattern: '**/docker-compose*.yml' };
    var yamlHoverProvider = new DockerHoverProvider(new DockerComposeParser(), DOCKER_COMPOSE_KEY_INFO);
    ctx.subscriptions.push(vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider));
    ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(YAML_MODE_ID, new DockerComposeCompletionItemProvider(), '.'));

    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.configure', configure));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.debug.configureLaunchJson', configureLaunchJson));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.build', buildImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.remove', removeImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.image.push', pushImage));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.start', startContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.start.interactive', startContainerInteractive));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.stop', stopContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.show-logs', showLogsContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.container.open-shell', openShellContainer));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.compose.up', composeUp));
    ctx.subscriptions.push(vscode.commands.registerCommand('vscode-docker.compose.down', composeDown));
}