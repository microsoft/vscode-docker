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

export class ExtraInfoSupport implements vscode.Modes.IExtraInfoSupport  {

	public computeInfo(document: vscode.TextDocument, position: vscode.Position) {
		if (!isDockerCompose(document.getUri())) {
			return Promise.resolve(null);
		}
		
		var lineEndColumn = document.getLineMaxColumn(position.line);		
		var line = document.getTextOnLine(position.line);

		if (line.length === 0) {
			// empty line
			return Promise.resolve(null);
		}

		var tokens = parser.parseLine(line);

		return this._computeInfoForLineWithTokens(line, tokens, position);
	}

	private _computeInfoForLineWithTokens(line:string, tokens:parser.IToken[], position:vscode.Position): Promise<vscode.Modes.IComputeExtraInfoResult> {
		var possibleTokens = parser.tokensAtColumn(tokens, position.character);

		return Promise.all(possibleTokens.map(tokenIndex => this._computeInfoForToken(line, tokens, tokenIndex))).then((results) => {
			return possibleTokens.map((tokenIndex, arrayIndex) => {
				return {
					startIndex: tokens[tokenIndex].startIndex,
					endIndex: tokens[tokenIndex].endIndex,
					result: results[arrayIndex]
				};
			});
		}).then((results) => {
			var r = results.filter(r => !!r.result);
			if (r.length === 0) {
				return null;
			}
			return {
				range: new vscode.Range(position.line, r[0].startIndex + 1, position.line, r[0].endIndex + 1),
				htmlContent: r[0].result
			};
		});
	}

	private _computeInfoForToken(line:string, tokens:parser.IToken[], tokenIndex:number): Promise<vscode.IHTMLContentElement[]> {
		// -------------
		// Detect hovering on a key
		if (tokens[tokenIndex].type === parser.TokenType.Key) {
			var keyName = parser.keyNameFromKeyToken(parser.tokenValue(line, tokens[tokenIndex]));
			var r = ExtraInfoSupport.getInfoForKey(keyName);
			if (r) {
				return Promise.resolve(r);
			}
		}

		// -------------
		// Detect <<image: [["something"]]>>
		// Detect <<image: [[something]]>>
		var r2 = this._getImageNameHover(line, tokens, tokenIndex);
		if (r2) {
			return r2;
		}

		return null;
	}

	private _getImageNameHover(line:string, tokens:parser.IToken[], tokenIndex:number): Promise<vscode.IHTMLContentElement[]> {
		// -------------
		// Detect <<image: [["something"]]>>
		// Detect <<image: [[something]]>>
		var originalValue = parser.tokenValue(line, tokens[tokenIndex]);

		var keyToken:string = null;
		tokenIndex--;
		while (tokenIndex > 0) {
			var type = tokens[tokenIndex].type;
			if (type === parser.TokenType.String || type === parser.TokenType.Text) {
				return null;
			}
			if (type === parser.TokenType.Key) {
				keyToken = parser.tokenValue(line, tokens[tokenIndex]);
				break;
			}
			tokenIndex--;
		}

		if (!keyToken) {
			return null;
		}
		var keyName = parser.keyNameFromKeyToken(keyToken);
		if (keyName === 'image') {
			var imageName = originalValue.replace(/^"/, '').replace(/"$/, '');
			return Promise.all([searchImageInRegistryHub(imageName)]).then((results) => {
				if (results[0] && results[1]) {
					return [{
						tagName: 'strong',
						text: 'DockerHub:'
					}, {
						tagName: 'br'
					}, {
						tagName: 'div',
						children: results[0]
					}, {
						tagName: 'strong',
						text: 'DockerRuntime:'
					}, {
						tagName: 'br'
					}, {
						tagName: 'div',
						children: results[1]
					}]
				}
				if (results[0]) {
					return results[0];
				}
				return results[1];
			});
		}
	}



	private static getInfoForKey(keyName:string): vscode.IHTMLContentElement[] {
		if (ExtraInfoSupport._KEY_INFO === null) {
			ExtraInfoSupport._KEY_INFO = {};
			Object.keys(parser.RAW_KEY_INFO).forEach((keyName) => {
				ExtraInfoSupport._KEY_INFO[keyName] = simpleMarkDownToHTMLContent(parser.RAW_KEY_INFO[keyName]);
			});
		}
		return ExtraInfoSupport._KEY_INFO[keyName] || null;
	}
	private static _KEY_INFO: { [keyName:string]: vscode.IHTMLContentElement[]; } = null;
}

enum TagType {
	pre,
	bold,
	normal
}
// TODO (peterj, 10/16/2015): this code is duplicated in dockerfileExtraInfo.ts, consider extracting it to a common file.
function simpleMarkDownToHTMLContent(source:string): vscode.IHTMLContentElement[] {
	var r:vscode.IHTMLContentElement[] = [];

	var lastPushedTo:number;
	var push = (to:number, type:TagType) => {
		if (lastPushedTo >= to) {
			return;
		}
		var text = source.substring(lastPushedTo, to);

		if (type === TagType.pre) {
			r.push({
				tagName: "span",
				style: "font-family:monospace",
				className: "token keyword",
				text: text
			});
		} else if (type === TagType.bold) {
			r.push({
				tagName: "strong",
				text: text
			});
		} else if (type === TagType.normal) {
			r.push({
				tagName: "span",
				text: text
			});
		}
		lastPushedTo = to;
	}

	var currentTagType = () => {
		if (inPre) {
			return TagType.pre;
		}
		if (inBold) {
			return TagType.bold;
		}
		return TagType.normal;
	}

	var inPre = false, inBold = false;
	for (var i = 0, len = source.length; i < len; i++) {
		var ch = source.charAt(i);

		if (ch === '\n') {
			push(i, currentTagType());
			r.push({
				tagName: 'br'
			});
			lastPushedTo = i + 1;
		} else if (ch === '`') {
			push(i, currentTagType());
			lastPushedTo = i + 1;
			inPre = !inPre;
		} else if (ch === '*') {
			push(i, currentTagType());
			lastPushedTo = i + 1;
			inBold = !inBold;
		}
	}
	push(source.length, currentTagType());

	return r;
}

function searchImageInRegistryHub(imageName:string): Promise<vscode.IHTMLContentElement[]> {
	return hub.searchImageInRegistryHub(imageName, true).then((result) => {
		if (result) {
			var r: vscode.IHTMLContentElement[] = [];

			// Name
			r.push({
				tagName: 'strong',
				className: 'token keyword',
				text: result.name
			});

			var tags = hub.tagsForImage(result);
			if (tags.length > 0) {
				r.push({
					tagName: 'strong',
					text: ' ' + tags + ' '
				});
			}

			if (result.star_count) {
				var plural = (result.star_count > 1);
				r.push({
					tagName: 'strong',
					text: String(result.star_count)
				})
				r.push({
					tagName: 'span',
					text: (plural ? ' stars' : ' star')
				});
			}

			// Description
			r.push({
				tagName: 'br'
			});
			r.push({
				tagName: 'span',
				text: result.description
			});

			return r;
		}
	})
}

