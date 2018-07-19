/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { CancellationToken, Hover, HoverProvider, MarkedString, Position, Range, TextDocument } from 'vscode';
import { KeyInfo } from "../dockerExtension";
import hub = require('../dockerHubApi');
import suggestHelper = require('../helpers/suggestSupportHelper');
import parser = require('../parser');

export class DockerComposeHoverProvider implements HoverProvider {
    public _parser: parser.Parser;
    public _keyInfo: KeyInfo;

    // Provide the parser you want to use as well as keyinfo dictionary.
    constructor(wordParser: parser.Parser, keyInfo: KeyInfo) {
        this._parser = wordParser;
        this._keyInfo = keyInfo;
    }

    public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
        let line = document.lineAt(position.line);

        if (line.text.length === 0) {
            return Promise.resolve(null);
        }

        let tokens = this._parser.parseLine(line);
        return this._computeInfoForLineWithTokens(line.text, tokens, position);
    }

    // tslint:disable-next-line:promise-function-async // Grandfathered in
    private _computeInfoForLineWithTokens(line: string, tokens: parser.IToken[], position: Position): Promise<Hover> {
        let possibleTokens = this._parser.tokensAtColumn(tokens, position.character);

        // tslint:disable-next-line:promise-function-async // Grandfathered in
        return Promise.all(possibleTokens.map(tokenIndex => this._computeInfoForToken(line, tokens, tokenIndex))).then((results) => {
            return possibleTokens.map((tokenIndex, arrayIndex) => {
                return {
                    startIndex: tokens[tokenIndex].startIndex,
                    endIndex: tokens[tokenIndex].endIndex,
                    result: results[arrayIndex]
                };
            });
        }).then((results) => {
            let filteredResults = results.filter(r => !!r.result);
            if (filteredResults.length === 0) {
                return;
            }

            let range = new Range(position.line, filteredResults[0].startIndex, position.line, filteredResults[0].endIndex);

            let hover = new Hover(filteredResults[0].result, range);

            return hover;

        });
    }

    // tslint:disable-next-line:promise-function-async // Grandfathered in
    private _computeInfoForToken(line: string, tokens: parser.IToken[], tokenIndex: number): Promise<MarkedString[]> {
        // -------------
        // Detect hovering on a key
        if (tokens[tokenIndex].type === parser.TokenType.Key) {
            let keyName = this._parser.keyNameFromKeyToken(this._parser.tokenValue(line, tokens[tokenIndex])).trim();
            let r = this._keyInfo[keyName];
            if (r) {
                return Promise.resolve([r]);
            }
        }

        // -------------
        // Detect <<image: [["something"]]>>
        // Detect <<image: [[something]]>>
        let helper = new suggestHelper.SuggestSupportHelper();
        let r2 = helper.getImageNameHover(line, this._parser, tokens, tokenIndex);
        if (r2) {
            return r2;
        }

        return;
    }
}
