/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { CancellationToken, Hover, HoverProvider, MarkedString, Position, Range, TextDocument } from 'vscode';
import { KeyInfo } from "../extension";
import parser = require('../parser');
import suggestHelper = require('../utils/suggestSupportHelper');

export class DockerComposeHoverProvider implements HoverProvider {
    // Provide the parser you want to use as well as keyinfo dictionary.
    public constructor(public readonly parser: parser.Parser, public readonly keyInfo: KeyInfo) {
    }

    public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        const line = document.lineAt(position.line);

        if (line.text.length === 0) {
            return Promise.resolve(null);
        }

        const tokens = this.parser.parseLine(line);
        return this.computeInfoForLineWithTokens(line.text, tokens, position);
    }

    private computeInfoForLineWithTokens(line: string, tokens: parser.IToken[], position: Position): Promise<Hover> {
        const possibleTokens = this.parser.tokensAtColumn(tokens, position.character);

        return Promise.all(possibleTokens.map(tokenIndex => this.computeInfoForToken(line, tokens, tokenIndex))).then((results) => {
            return possibleTokens.map((tokenIndex, arrayIndex) => {
                return {
                    startIndex: tokens[tokenIndex].startIndex,
                    endIndex: tokens[tokenIndex].endIndex,
                    result: results[arrayIndex]
                };
            });
        }).then((results) => {
            const filteredResults = results.filter(r => !!r.result);
            if (filteredResults.length === 0) {
                return;
            }

            const range = new Range(position.line, filteredResults[0].startIndex, position.line, filteredResults[0].endIndex);

            const hover = new Hover(filteredResults[0].result, range);

            return hover;

        });
    }

    private computeInfoForToken(line: string, tokens: parser.IToken[], tokenIndex: number): Promise<MarkedString[]> {
        // -------------
        // Detect hovering on a key
        if (tokens[tokenIndex].type === parser.TokenType.Key) {
            const keyName = this.parser.keyNameFromKeyToken(this.parser.tokenValue(line, tokens[tokenIndex])).trim();
            const r = this.keyInfo[keyName];
            if (r) {
                return Promise.resolve([r]);
            }
        }

        // -------------
        // Detect <<image: [["something"]]>>
        // Detect <<image: [[something]]>>
        const helper = new suggestHelper.SuggestSupportHelper();
        const r2 = helper.getImageNameHover(line, this.parser, tokens, tokenIndex);
        if (r2) {
            return r2;
        }

        return;
    }
}
