/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import {TextLine} from 'vscode';
import {Parser, TokenType, IToken} from '../parser';

export class DockerfileParser extends Parser {
    constructor() {
        var parseRegex = /\ +$/g;
        super(parseRegex);
    }

    parseLine(textLine: TextLine): IToken[] {
        if (textLine.isEmptyOrWhitespace) {
            return null;
        }

        var startIndex = textLine.firstNonWhitespaceCharacterIndex;

        // Check for comment 
        if (textLine.text.charAt(startIndex) === '#') {
            return null;
        }

        var tokens: IToken[] = [];
        var previousTokenIndex = 0;
        var keyFound: boolean = false;

        for (var j = startIndex, len = textLine.text.length; j < len; j++) {
            var ch = textLine.text.charAt(j);

            if (ch === ' ' || ch === '\t') {
                previousTokenIndex = j;
                tokens.push({
                    startIndex: 0,
                    endIndex: j,
                    type: TokenType.Key
                });
                break;
            }
        }

        tokens.push({
            startIndex: previousTokenIndex,
            endIndex: textLine.text.length,
            type: TokenType.String
        });
        return tokens;
    }
}