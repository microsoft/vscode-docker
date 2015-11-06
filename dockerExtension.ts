/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {DockerHoverProvider} from './dockerHoverProvider';
import {DockerfileCompletionItemProvider} from './dockerfile/dockerfileCompletionItemProvider';
import {YamlCompletionItemProvider} from './yaml/yamlCompletionItemProvider';
import {DOCKER_KEY_INFO} from  './dockerfile/dockerfileKeyInfo';
import {YAML_KEY_INFO} from './yaml/yamlKeyInfo';
import {YamlParser} from './yaml/yamlParser';
import {DockerfileParser} from './dockerfile/dockerfileParser';
import vscode = require('vscode');

export function activate(ctx: vscode.ExtensionContext): void {
	const DOCKERFILE_MODE_ID: vscode.DocumentFilter = { language: 'dockerfile', scheme: 'file' };
	var dockerHoverProvider = new DockerHoverProvider(new DockerfileParser(), DOCKER_KEY_INFO);
	ctx.subscriptions.push(vscode.languages.registerHoverProvider(DOCKERFILE_MODE_ID, dockerHoverProvider));
	ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(DOCKERFILE_MODE_ID, new DockerfileCompletionItemProvider(), '.'));

	const YAML_MODE_ID: vscode.DocumentFilter = { language: 'yaml', scheme: 'file' };
	var yamlHoverProvider = new DockerHoverProvider(new YamlParser(), YAML_KEY_INFO);
	ctx.subscriptions.push(vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider));
	ctx.subscriptions.push(vscode.languages.registerCompletionItemProvider(YAML_MODE_ID, new YamlCompletionItemProvider(), '.'))
}