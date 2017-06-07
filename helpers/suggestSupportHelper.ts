/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import hub = require('../dockerHubApi');
import parser = require('../parser');
import { FROM_DIRECTIVE_PATTERN } from "../dockerExtension";

export class SuggestSupportHelper {
    suggestImages(word: string): Promise<vscode.CompletionItem[]> {
        return hub.searchImagesInRegistryHub(word, true).then((results) => {
            return results.map((image) => {
                var stars = '';
                if (image.star_count > 0) {
                    stars = ' ' + image.star_count + ' ' + (image.star_count > 1 ? 'stars' : 'star');
                }

                return {
                    label: image.name,
                    kind: vscode.CompletionItemKind.Value,
                    detail: hub.tagsForImage(image) + stars,
                    insertText: image.name,
                    documentation: image.description,
                }
            });
        });
    }

    searchImageInRegistryHub(imageName: string): Promise<vscode.MarkedString[]> {
        return hub.searchImageInRegistryHub(imageName, true).then((result) => {
            if (result) {
                var r: vscode.MarkedString[] = [];
                var tags = hub.tagsForImage(result);

                // Name, tags and stars.
                var nameString = '';
                if (tags.length > 0) {
                    nameString = '**' + result.name + ' ' + tags + '** ';
                } else {
                    nameString = '**' + result.name + '**';
                }

                if (result.star_count) {
                    var plural = (result.star_count > 1);
                    nameString += '**' + String(result.star_count) + (plural ? ' stars' : ' star') + '**';
                }

                r.push(nameString);

                // Description
                r.push(result.description);

                return r;
            }
        })
    }

    getImageNameHover(line: string, _parser: parser.Parser, tokens: parser.IToken[], tokenIndex: number): Promise<vscode.MarkedString[]> {
        // -------------
        // Detect <<image: [["something"]]>>
        // Detect <<image: [[something]]>>
        var originalValue = _parser.tokenValue(line, tokens[tokenIndex]);

        var keyToken: string = null;
        tokenIndex--;
        while (tokenIndex >= 0) {
            var type = tokens[tokenIndex].type;
            if (type === parser.TokenType.String || type === parser.TokenType.Text) {
                return;
            }
            if (type === parser.TokenType.Key) {
                keyToken = _parser.tokenValue(line, tokens[tokenIndex]);
                break;
            }
            tokenIndex--;
        }

        if (!keyToken) {
            return;
        }
        var keyName = _parser.keyNameFromKeyToken(keyToken);
        if (keyName === 'image' || keyName === 'FROM') {
            let imageName;

            if (keyName === 'FROM') {
                imageName = line.match(FROM_DIRECTIVE_PATTERN)[1];
            } else {
                imageName = originalValue.replace(/^"/, '').replace(/"$/, '');
            }

            return this.searchImageInRegistryHub(imageName).then((results) => {
                if (results[0] && results[1]) {
                    return ['**DockerHub:**', results[0], '**DockerRuntime**', results[1]];
                }

                if (results[0]) {
                    return [results[0]];
                }
                
                return [results[1]];
            });
        }
    }
}