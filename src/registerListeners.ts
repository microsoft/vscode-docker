/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, TextDocument, workspace } from 'vscode';
import { ext } from './extensionVariables';

let lastUploadTime: number = 0;
const hourInMilliseconds = 60 * 60 * 1000;

export function registerListeners(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        workspace.onDidSaveTextDocument(
            (doc: TextDocument) => {
                // If it's not a Dockerfile, or last upload time is within an hour, skip
                if (doc.languageId !== 'dockerfile' || lastUploadTime + hourInMilliseconds > Date.now()) {
                    return;
                }

                lastUploadTime = Date.now();
                ext.reporter.sendTelemetryEvent('dockerfilesave', { "lineCount": doc.lineCount.toString() }, {});
            }
        )
    );
}
