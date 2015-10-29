/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import hub = require('../dockerHubApi');

export class SuggestSupportHelper {	
	suggestImages(word:string, hasLeadingQuote:boolean): Promise<vscode.Modes.ISuggestions[]> {
		return this.suggestHubImages(word).then((results) => {
			return [{
				incomplete: true,
				currentWord: (hasLeadingQuote ? '"' + word : word),
				suggestions: results
			}]
		});
	}
	
	suggestHubImages(word:string): Promise<vscode.Modes.ISuggestion[]> {
		return hub.searchImagesInRegistryHub(word, true).then((results) => {
			return results.map((image) => {
				var stars = '';
				if (image.star_count > 0) {
					stars = ' ' + image.star_count + ' ' + (image.star_count > 1 ? 'stars' : 'star');
				}
				return {
					label: image.name,
					codeSnippet: image.name,
					type: 'value',
					documentationLabel: image.description,
					typeLabel: hub.tagsForImage(image) + stars
				}
			});
		});
	}
}