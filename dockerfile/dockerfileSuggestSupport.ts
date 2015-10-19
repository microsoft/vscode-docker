/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import helper = require('../helpers/suggestSupportHelper');

// IntelliSense
export class SuggestSupport implements vscode.Modes.ISuggestSupport {

	public triggerCharacters:string[] = [];
	public excludeTokens:string[] = [];

	public suggest(document:vscode.TextDocument, position:vscode.Position): Promise<vscode.Modes.ISuggestions[]> {
		var dockerSuggestSupport = new helper.SuggestSupportHelper();
		
		// Get the line where intellisense was invoked on (e.g. 'FROM ').
		var line = document.getTextOnLine(position.line);
		
		var textBefore = line.substring(0, position.character);
		
		// Matches strings like: 'FROM imagename'
		var fromTextDocker = textBefore.match(/^\s*FROM\s*([^"]*)$/);
		
		if (fromTextDocker) {
			var imageText = fromTextDocker[1];
			// Doesn't have a leading quote
			return dockerSuggestSupport.suggestImages(imageText, false);
		}

		return Promise.resolve([]);
	}
}