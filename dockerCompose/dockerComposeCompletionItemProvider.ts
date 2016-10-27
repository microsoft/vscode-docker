/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import {TextDocument, Position, CancellationToken, CompletionItem, CompletionItemProvider, CompletionItemKind, Uri} from 'vscode';
import helper = require('../helpers/suggestSupportHelper');
import {DOCKER_COMPOSE_V1_KEY_INFO, DOCKER_COMPOSE_V2_KEY_INFO} from './dockerComposeKeyInfo';
import hub = require('../dockerHubApi');

export class DockerComposeCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        var yamlSuggestSupport = new helper.SuggestSupportHelper(); 

        // Determine the schema version of the current compose file,
        // based on the existence of a top-level "version" property.
        var isV2Document = /^version:/im.test(document.getText());

        // Get the line where intellisense was invoked on (e.g. 'image: u').
        var line = document.lineAt(position.line).text;

        if (line.length === 0) {
            // empty line
            return Promise.resolve(this.suggestKeys('', isV2Document));
        }

        let range = document.getWordRangeAtPosition(position);

        // Get the text where intellisense was invoked on (e.g. 'u').
        let word = range && document.getText(range) || '';

        var textBefore = line.substring(0, position.character);
        if (/^\s*[\w_]*$/.test(textBefore)) {
            // on the first token
            return Promise.resolve(this.suggestKeys(word, isV2Document));
        }

        // Matches strings like: 'image: "ubuntu'
        var imageTextWithQuoteMatchYaml = textBefore.match(/^\s*image\s*\:\s*"([^"]*)$/);

        if (imageTextWithQuoteMatchYaml) {
            var imageText = imageTextWithQuoteMatchYaml[1];
            return yamlSuggestSupport.suggestImages(imageText);
        }

        // Matches strings like: 'image: ubuntu'
        var imageTextWithoutQuoteMatch = textBefore.match(/^\s*image\s*\:\s*([\w\:\/]*)/);

        if (imageTextWithoutQuoteMatch) {
            var imageText = imageTextWithoutQuoteMatch[1];
            return yamlSuggestSupport.suggestImages(imageText);
        }

        return Promise.resolve([]);
    }

    private suggestKeys(word: string, useV2Schema: boolean = false): CompletionItem[] {
        const keys = useV2Schema ? DOCKER_COMPOSE_V2_KEY_INFO : DOCKER_COMPOSE_V1_KEY_INFO;

        return Object.keys(keys).map(ruleName => {
            var completionItem = new CompletionItem(ruleName);
            completionItem.kind = CompletionItemKind.Keyword;
            completionItem.insertText = ruleName + ': ';
            completionItem.documentation = keys[ruleName];
            return completionItem;
        });
    }
}