/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');

import parser = require('./yamlParser');
import hub = require('../dockerHubApi');

function isDockerCompose(resource:vscode.Uri): boolean {
	return /docker\-compose\.yml$/.test(resource.toString());
}

export class SuggestSupport implements vscode.Modes.ISuggestSupport {

	public triggerCharacters:string[] = [];
	public excludeTokens:string[] = [];

	public suggest(document:vscode.TextDocument, position:vscode.Position): Promise<vscode.Modes.ISuggestions[]> {
		if (!isDockerCompose(document.getUri())) {
			return Promise.resolve(null);
		}

		var line = document.getTextOnLine(position.line);

		if (line.length === 0) {
			// empty line
			return Promise.resolve([this._suggestKeys('')]);
		}

		let range = document.getWordRangeAtPosition(position);
		let word = range && document.getTextInRange(range) || '';

		var textBefore = line.substring(0, position.character);

		if (/^\s*[\w_]*$/.test(textBefore)) {
			// on the first token
			return Promise.resolve([this._suggestKeys(word)]);
		}

		var imageTextWithQuoteMatch = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);
		if (imageTextWithQuoteMatch) {
			var imageText = imageTextWithQuoteMatch[1];
			return this._suggestImages(imageText, true);
		}

		var imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);
		if (imageTextWithoutQuoteMatch) {
			var imageText = imageTextWithoutQuoteMatch[1];
			return this._suggestImages(imageText, false);
		}

		return Promise.resolve([]);
	}

	private _suggestImages(word:string, hasLeadingQuote:boolean): Promise<vscode.Modes.ISuggestions[]> {
		return this._suggestHubImages(word).then((results) => {
			return [{
				incomplete: true,
				currentWord: (hasLeadingQuote ? '"' + word : word),
				suggestions: results
			}]
		});
	}

	private _suggestHubImages(word:string): Promise<vscode.Modes.ISuggestion[]> {
		return hub.searchImagesInRegistryHub(word, true).then((results) => {
			return results.map((image) => {
				var stars = '';
				if (image.star_count > 0) {
					stars = ' ' + image.star_count + ' ' + (image.star_count > 1 ? 'stars' : 'star');
				}
				return {
					label: image.name,
					codeSnippet: '"' + image.name + '"',
					type: 'value',
					documentationLabel: image.description,
					typeLabel: hub.tagsForImage(image) + stars
				}
			});
		});
	}

	private _suggestKeys(word:string): vscode.Modes.ISuggestions {
		return {
			currentWord: word,
			suggestions: Object.keys(parser.RAW_KEY_INFO).map((ruleName) => {
				return {
					label: ruleName,
					codeSnippet: ruleName + ': ',
					type: 'property',
					documentationLabel: parser.RAW_KEY_INFO[ruleName]
				}
			})
		};
	}
}

