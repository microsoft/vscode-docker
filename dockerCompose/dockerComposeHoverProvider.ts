/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { Range, TextDocument, Position, CancellationToken, HoverProvider, Hover, MarkedString } from 'vscode';
import { KeyInfo } from "../dockerExtension";
import parser = require('../parser');
import hub = require('../dockerHubApi');
import suggestHelper = require('../helpers/suggestSupportHelper');

export class DockerComposeHoverProvider implements HoverProvider {
    _parser: parser.Parser;
    _keyInfo: KeyInfo;

    // Provide the parser you want to use as well as keyinfo dictionary.
    constructor(wordParser: parser.Parser, keyInfo: KeyInfo) {
        this._parser = wordParser;
        this._keyInfo = keyInfo;
    }

    public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        var line = document.lineAt(position.line);

        if (line.text.length === 0) {
            return Promise.resolve(null);
        }

        var tokens = this._parser.parseLine(line);
        return this._computeInfoForLineWithTokens(line.text, tokens, position);
    }

    private _computeInfoForLineWithTokens(line: string, tokens: parser.IToken[], position: Position): Promise<Hover> {
        var possibleTokens = this._parser.tokensAtColumn(tokens, position.character);

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
                return;
            }

            let range = new Range(position.line, r[0].startIndex, position.line, r[0].endIndex);

            let hover = new Hover(r[0].result, range);

            return hover;

        });
    }

    private _computeInfoForToken(line: string, tokens: parser.IToken[], tokenIndex: number): Promise<MarkedString[]> {
        // -------------
        // Detect hovering on a key
        if (tokens[tokenIndex].type === parser.TokenType.Key) {
            var keyName = this._parser.keyNameFromKeyToken(this._parser.tokenValue(line, tokens[tokenIndex])).trim();
            var r = this._keyInfo[keyName];
            if (r) {
                return Promise.resolve([r]);
            }
        }

        // -------------
        // Detect <<image: [["something"]]>>
        // Detect <<image: [[something]]>>
        var helper = new suggestHelper.SuggestSupportHelper();
        var r2 = helper.getImageNameHover(line, this._parser, tokens, tokenIndex);
        if (r2) {
            return r2;
        }

        return;
    }
}