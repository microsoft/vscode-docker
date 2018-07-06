/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import { Parser, TokenType, IToken } from '../parser';

export class DockerComposeParser extends Parser {
    constructor() {
        var parseRegex = /\:+$/g;
        super(parseRegex);
    }

    parseLine(textLine: vscode.TextLine): IToken[] {
        var r: IToken[] = [];
        var lastTokenEndIndex = 0, lastPushedToken: IToken = null;

        var emit = (end: number, type: TokenType) => {
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
        var idx = textLine.firstNonWhitespaceCharacterIndex;
        var line = textLine.text;

        for (var i = idx, len = line.length; i < len; i++) {
            var ch = line.charAt(i);

            if (inString) {
                if (ch === '"' && line.charAt(i - 1) !== '\\') {
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

            if (ch === ':') {
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
