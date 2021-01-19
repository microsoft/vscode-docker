/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownString } from 'vscode';
import { getHandlebarsWithHelpers } from '../utils/getHandlebarsWithHelpers';

export async function resolveTooltipMarkdown(templateString: string, context: unknown): Promise<MarkdownString> {
    const handlebars = await getHandlebarsWithHelpers();

    const template = handlebars.compile(templateString);

    const markdownString = template(context);
    const result = new MarkdownString(markdownString, true);
    result.isTrusted = true;
    return result;
}

