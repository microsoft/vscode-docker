/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import {TextDocument, Position, CancellationToken, CompletionItem, CompletionItemProvider, CompletionItemKind, Uri} from 'vscode';
import helper = require('../helpers/suggestSupportHelper');
import {YAML_KEY_INFO} from './yamlKeyInfo';
import hub = require('../dockerHubApi');

function isDockerCompose(resource: string): boolean {
	return /docker\-compose\.yml$/.test(resource);
}

export class YamlCompletionItemProvider implements CompletionItemProvider {

	public triggerCharacters: string[] = [];
	public excludeTokens: string[] = [];

	public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
		if (!isDockerCompose(document.fileName)) {
			return Promise.resolve(null);
		}

		var yamlSuggestSupport = new helper.SuggestSupportHelper(); 

		// Get the line where intellisense was invoked on (e.g. 'image: u').
		var line = document.lineAt(position.line).text;

		if (line.length === 0) {
			// empty line
			return Promise.resolve(this.suggestKeys(''));
		}

		let range = document.getWordRangeAtPosition(position);
		
		// Get the text where intellisense was invoked on (e.g. 'u').
		let word = range && document.getText(range) || '';

		var textBefore = line.substring(0, position.character);
		if (/^\s*[\w_]*$/.test(textBefore)) {
			// on the first token
			return Promise.resolve(this.suggestKeys(word));
		}

		// Matches strings like: 'image: "ubuntu'
		var imageTextWithQuoteMatchYaml = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);

		if (imageTextWithQuoteMatchYaml) {
			var imageText = imageTextWithQuoteMatchYaml[1];
			return yamlSuggestSupport.suggestImages(imageText);
		}

		// Matches strings like: 'image: ubuntu'
		var imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);

		if (imageTextWithoutQuoteMatch) {
			var imageText = imageTextWithoutQuoteMatch[1];
			return yamlSuggestSupport.suggestImages(imageText);
		}

		return Promise.resolve([]);
	}

	private suggestKeys(word: string): CompletionItem[] {
		return Object.keys(YAML_KEY_INFO).map(ruleName => {
			var completionItem = new CompletionItem(ruleName);
			completionItem.kind = CompletionItemKind.Keyword;
			completionItem.insertText = ruleName + ': ';
			completionItem.documentation = YAML_KEY_INFO[ruleName];
			return completionItem;
		});
	}
}