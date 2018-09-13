/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import vscode = require('vscode');
import { FROM_DIRECTIVE_PATTERN } from "../dockerExtension";
import hub = require('../dockerHubApi');
import parser = require('../parser');

export class SuggestSupportHelper {
    // tslint:disable-next-line:promise-function-async // Grandfathered in
    public suggestImages(word: string): Promise<vscode.CompletionItem[]> {
        return hub.searchImagesInRegistryHub(word, true).then((results) => {
            return results.map((image) => {
                let stars = '';
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

    // tslint:disable-next-line:promise-function-async // Grandfathered in
    public searchImageInRegistryHub(imageName: string): Promise<vscode.MarkedString[] | undefined> {
        return hub.searchImageInRegistryHub(imageName, true).then((result) => {
            if (result) {
                let r: vscode.MarkedString[] = [];
                let tags = hub.tagsForImage(result);

                // Name, tags and stars.
                let nameString = '';
                if (tags.length > 0) {
                    nameString = '**' + result.name + ' ' + tags + '** ';
                } else {
                    nameString = '**' + result.name + '**';
                }

                if (result.star_count) {
                    let plural = (result.star_count > 1);
                    nameString += '**' + String(result.star_count) + (plural ? ' stars' : ' star') + '**';
                }

                r.push(nameString);

                // Description
                r.push(result.description);

                return r;
            }
        })
    }

    // tslint:disable-next-line:promise-function-async // Grandfathered in
    public getImageNameHover(line: string, _parser: parser.Parser, tokens: parser.IToken[], tokenIndex: number): Promise<vscode.MarkedString[]> {
        // -------------
        // Detect <<image: [["something"]]>>
        // Detect <<image: [[something]]>>
        let originalValue = _parser.tokenValue(line, tokens[tokenIndex]);

        let keyToken: string | undefined;
        tokenIndex--;
        while (tokenIndex >= 0) {
            let type = tokens[tokenIndex].type;
            if (type === parser.TokenType.String || type === parser.TokenType.Text) {
                return Promise.resolve([]); // asdf test
            }
            if (type === parser.TokenType.Key) {
                keyToken = _parser.tokenValue(line, tokens[tokenIndex]);
                break;
            }
            tokenIndex--;
        }

        if (!keyToken) {
            return Promise.resolve([]); // asdf test
        }
        let keyName = _parser.keyNameFromKeyToken(keyToken);
        if (keyName === 'image' || keyName === 'FROM') {
            let imageName: string;

            if (keyName === 'FROM') {
                let match = line.match(FROM_DIRECTIVE_PATTERN);
                if (match) {
                    imageName = match[1];
                } else {
                    assert.fail('Expected to find FROM directive in line'); // asdf test
                }
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
