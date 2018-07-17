/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem } from 'vscode';
import helper = require('../helpers/suggestSupportHelper');
import { FROM_DIRECTIVE_PATTERN } from "../dockerExtension";

// IntelliSense
export class DockerfileCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        let dockerSuggestSupport = new helper.SuggestSupportHelper();

        let textLine = document.lineAt(position.line);

        let fromTextDocker = textLine.text.match(FROM_DIRECTIVE_PATTERN);

        if (fromTextDocker) {
            return dockerSuggestSupport.suggestImages(fromTextDocker[1]);
        }

        return Promise.resolve([]);
    }
}
