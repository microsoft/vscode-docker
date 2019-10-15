/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, TextDocument, workspace } from 'vscode';
import { ext } from './extensionVariables';

export function registerListeners(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        workspace.onDidSaveTextDocument((doc: TextDocument) => {
            if (doc.languageId !== 'dockerfile') {
                return;
            }

            ext.reporter.sendTelemetryEvent('dockerfilesave', {}, { "lineCount": doc.lineCount });
        })
    );
}
