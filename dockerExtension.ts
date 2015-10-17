/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import dockerfileDef = require('./dockerfile/dockerfileDef');
import dockerExtraInfoSupport = require('./dockerfile/dockerfileExtraInfo');
import yamlExtraInfoSupport = require('./yaml/yamlExtraInfo');
import suggestSupport = require('./yaml/yamlSuggestSupport');
import vscode = require('vscode');

export function activate(subscriptions: vscode.Disposable[]) { 
	
	var DOCKERFILE_MODE_ID = 'dockerfile';
	subscriptions.push(vscode.Modes.registerMonarchDefinition(DOCKERFILE_MODE_ID, dockerfileDef.language));
	subscriptions.push(vscode.Modes.ExtraInfoSupport.register(DOCKERFILE_MODE_ID, new dockerExtraInfoSupport.ExtraInfoSupport()));

	var YAML_MODE_ID = 'yaml';
	subscriptions.push(vscode.Modes.ExtraInfoSupport.register(YAML_MODE_ID, new yamlExtraInfoSupport.ExtraInfoSupport()));
	subscriptions.push(vscode.Modes.SuggestSupport.register(YAML_MODE_ID, new suggestSupport.SuggestSupport()));
	subscriptions.push(vscode.Modes.CommentsSupport.register(YAML_MODE_ID, {
		commentsConfiguration: {
			lineCommentTokens: ['#']
		}
	}));
}