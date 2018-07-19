/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemProvider, Position, TextDocument, Uri } from 'vscode';
import hub = require('../dockerHubApi');
import helper = require('../helpers/suggestSupportHelper');
import composeVersions from './dockerComposeKeyInfo';

export class DockerComposeCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    // tslint:disable-next-line:promise-function-async // Grandfathered in
    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        let yamlSuggestSupport = new helper.SuggestSupportHelper();

        // Determine the schema version of the current compose file,
        // based on the existence of a top-level "version" property.
        let versionMatch = document.getText().match(/^version:\s*(["'])(\d+(\.\d)?)\1/im);
        let version = versionMatch ? versionMatch[2] : "1";

        // Get the line where intellisense was invoked on (e.g. 'image: u').
        let line = document.lineAt(position.line).text;

        if (line.length === 0) {
            // empty line
            return Promise.resolve(this.suggestKeys('', version));
        }

        let range = document.getWordRangeAtPosition(position);

        // Get the text where intellisense was invoked on (e.g. 'u').
        let word = range && document.getText(range) || '';

        let textBefore = line.substring(0, position.character);
        if (/^\s*[\w_]*$/.test(textBefore)) {
            // on the first token
            return Promise.resolve(this.suggestKeys(word, version));
        }

        // Matches strings like: 'image: "ubuntu'
        let imageTextWithQuoteMatchYaml = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);

        if (imageTextWithQuoteMatchYaml) {
            let imageText = imageTextWithQuoteMatchYaml[1];
            return yamlSuggestSupport.suggestImages(imageText);
        }

        // Matches strings like: 'image: ubuntu'
        let imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);

        if (imageTextWithoutQuoteMatch) {
            let imageText = imageTextWithoutQuoteMatch[1];
            return yamlSuggestSupport.suggestImages(imageText);
        }

        return Promise.resolve([]);
    }

    private suggestKeys(word: string, version: string): CompletionItem[] {
        // Attempt to grab the keys for the requested schema version,
        // otherwise, fall back to showing a composition of all possible keys.
        const keys = composeVersions[`v${version}`] || composeVersions.All;

        return Object.keys(keys).map(ruleName => {
            let completionItem = new CompletionItem(ruleName);
            completionItem.kind = CompletionItemKind.Keyword;
            completionItem.insertText = ruleName + ': ';
            completionItem.documentation = keys[ruleName];
            return completionItem;
        });
    }
}
