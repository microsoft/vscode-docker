/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem } from 'vscode';
import helper = require('../helpers/suggestSupportHelper');

// IntelliSense
export class DockerfileCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        var dockerSuggestSupport = new helper.SuggestSupportHelper();

        var textLine = document.lineAt(position.line);

        // Matches strings like: 'FROM imagename'
        var fromTextDocker = textLine.text.match(/^\s*FROM\s*([^"]*)$/);

        if (fromTextDocker) {
            return dockerSuggestSupport.suggestImages(fromTextDocker[1]);
        }

        return Promise.resolve([]);
    }
}