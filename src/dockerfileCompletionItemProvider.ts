/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { CancellationToken, CompletionItem, CompletionItemProvider, Position, TextDocument } from 'vscode';
import { FROM_DIRECTIVE_PATTERN } from './constants';
import helper = require('./utils/suggestSupportHelper');

// IntelliSense
export class DockerfileCompletionItemProvider implements CompletionItemProvider {

    public triggerCharacters: string[] = [];
    public excludeTokens: string[] = [];

    /* eslint-disable-next-line @typescript-eslint/promise-function-async */ // Grandfathered in
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
