/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
 
'use strict';

import vscode = require('vscode');

enum TagType {
	pre,
	bold,
	normal
}

export function simpleMarkDownToHTMLContent(source:string): vscode.IHTMLContentElement[] {
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