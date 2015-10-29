/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');

export class Parser {
	_modeId: string; 
	_keySeparator: string;
	_tokenParseRegex: RegExp; 
	
	constructor(modeId: string) {
		this._modeId = modeId; 
		
		// Set the parser settings, depending on the mode. 
		if (this._modeId === "dockerfile") {
			this._keySeparator = ' ';
			this._tokenParseRegex = /\ +$/g;
		} else if (this._modeId === 'yaml') {
			this._keySeparator = ':';
			this._tokenParseRegex = /\:+$/g;
		}
	}	
	
	keyNameFromKeyToken(keyToken:string): string {
		return keyToken.replace(this._tokenParseRegex, '');	
	}

	tokenValue(line:string, token:IToken): string {
		return line.substring(token.startIndex, token.endIndex);
	}

    tokensAtColumn(tokens:IToken[], charIndex:number): number[] {
		for (var i = 0, len = tokens.length; i < len; i++) {
			var token = tokens[i];
			
			if (token.endIndex < charIndex) {
				continue;
			}
			
			if (token.endIndex === charIndex && i + 1 < len) {
				return [i, i + 1]
			}
			return [i];
		}
		
		// should not happen: no token found? => return the last one
		return [tokens.length - 1];
	}
	
	/**
	 ** A super simplified parser only looking out for strings and comments
	 **/
	 parseLine(line:string): IToken[] {
		 var r: IToken[] = [];
		 var lastTokenEndIndex = 0, lastPushedToken:IToken = null;
		 
		 var emit = (end:number, type:TokenType) => {
			 if (end <= lastTokenEndIndex) {
				 return;
			 }
			 
			 if (lastPushedToken && lastPushedToken.type === type) {
				 // merge with last pushed token
				 lastPushedToken.endIndex = end;
				 lastTokenEndIndex = end;
				 return;
			}
			
			lastPushedToken = {
				startIndex: lastTokenEndIndex,
				endIndex: end,
				type: type
			};
			
			r.push(lastPushedToken);
			lastTokenEndIndex = end;
		};
		
		var inString = false;
		
		for (var i = 0, len = line.length; i < len; i++) {
			var ch = line.charAt(i);
			
			if (inString) {
				if (ch === '"' && line.charAt(i-1) !== '\\') {
					inString = false;
					emit(i + 1, TokenType.String);
				}
				
				continue;
			}
			
			if (ch === '"') {
				emit(i, TokenType.Text);
				inString = true;
				continue;
			}
			
			if (ch === '#') {
				// Comment the rest of the line
				emit(i, TokenType.Text);
				emit(line.length, TokenType.Comment);
				break;
			}
			
			if (ch === this._keySeparator) {
				emit(i + 1, TokenType.Key);
			}
			
			if (ch === ' ' || ch === '\t') {
				emit(i, TokenType.Text);
				emit(i + 1, TokenType.Whitespace);
			}
		}
		
		emit(line.length, TokenType.Text);
		return r;
	}
}

export enum TokenType {
	Whitespace,
	Text,
	String,
	Comment,
	Key
}

export interface IToken {
	startIndex: number;
	endIndex: number;
	type: TokenType;
}