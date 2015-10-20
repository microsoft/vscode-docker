/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import helper = require('../helpers/suggestSupportHelper');
import keyInfo = require('./yamlKeyInfo');
import hub = require('../dockerHubApi');

function isDockerCompose(resource:vscode.Uri): boolean {
	return /docker\-compose\.yml$/.test(resource.toString());
}

// IntelliSense
export class SuggestSupport implements vscode.Modes.ISuggestSupport {

	public triggerCharacters:string[] = [];
	public excludeTokens:string[] = [];

	public suggest(document:vscode.TextDocument, position:vscode.Position): Promise<vscode.Modes.ISuggestions[]> {
		if (!isDockerCompose(document.getUri())) {
			return Promise.resolve(null);
		}
		
		var yamlSuggestSupport = new helper.SuggestSupportHelper(); 

		// Get the line where intellisense was invoked on (e.g. 'image: u').
		var line = document.getTextOnLine(position.line);

		if (line.length === 0) {
			// empty line
			return Promise.resolve([this.suggestKeys('')]);
		}
		
		let range = document.getWordRangeAtPosition(position);
		
		// Get the text where intellisense was invoked on (e.g. 'u').
		let word = range && document.getTextInRange(range) || '';

		var textBefore = line.substring(0, position.character);		
		if (/^\s*[\w_]*$/.test(textBefore)) {
			// on the first token
			return Promise.resolve([this.suggestKeys(word)]);
		}

		// Matches strings like: 'image: "ubuntu'
		var imageTextWithQuoteMatchYaml = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);
			
		if (imageTextWithQuoteMatchYaml) {
			var imageText = imageTextWithQuoteMatchYaml[1];
			return yamlSuggestSupport.suggestImages(imageText, true);
		}

		// Matches strings like: 'image: ubuntu'
		var imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);
		
		if (imageTextWithoutQuoteMatch) {
			var imageText = imageTextWithoutQuoteMatch[1];
			return yamlSuggestSupport.suggestImages(imageText, false);
		}
		
		return Promise.resolve([]);
	}
	
	private suggestKeys(word:string): vscode.Modes.ISuggestions {
			return {
			currentWord: word,
			suggestions: Object.keys(keyInfo.KEY_INFO).map((ruleName) => {
				return {
					label: ruleName,
					codeSnippet: ruleName + ': ',
					type: 'property',
					documentationLabel: keyInfo.KEY_INFO[ruleName]
				}
			})
			};
		}
}