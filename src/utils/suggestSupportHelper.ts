/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { searchImagesInRegistryHub, tagsForImage } from '../dockerHubSearch';

export class SuggestSupportHelper {
    /* eslint-disable-next-line @typescript-eslint/promise-function-async */ // Grandfathered in
    public suggestImages(word: string): Promise<vscode.CompletionItem[]> {
        return searchImagesInRegistryHub(word, true).then((results) => {
            return results.map((image) => {
                let stars = '';
                if (image.star_count > 0) {
                    stars = ' ' + image.star_count + ' ' + (image.star_count > 1 ? 'stars' : 'star');
                }

                return {
                    label: image.name,
                    kind: vscode.CompletionItemKind.Value,
                    detail: tagsForImage(image) + stars,
                    insertText: image.name,
                    documentation: image.description,
                };
            });
        });
    }
}
