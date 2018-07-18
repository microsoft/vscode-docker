/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import { CancellationToken, CompletionItem, CompletionItemProvider, Position, TextDocument } from 'vscode';
import { FROM_DIRECTIVE_PATTERN } from "../dockerExtension";
import helper = require('../helpers/suggestSupportHelper');

// IntelliSense
export class DockerfileCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    // tslint:disable-next-line:promise-function-async // Grandfathered in
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
