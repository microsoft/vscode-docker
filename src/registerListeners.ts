/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, TextDocument, workspace } from 'vscode';
import { ext } from './extensionVariables';

let lastUploadTime: number = 0;
const hourInMilliseconds = 1000 * 60 * 60;

export function registerListeners(ctx: ExtensionContext): void {
    if (ext.telemetryOptIn) {
        ctx.subscriptions.push(workspace.onDidSaveTextDocument(onDidSaveTextDocument));
    }
}

function onDidSaveTextDocument(doc: TextDocument): void {
    // If it's not a Dockerfile, or last upload time is within an hour, skip
    if (doc.languageId !== 'dockerfile' || lastUploadTime + hourInMilliseconds > Date.now()) {
        return;
    }

    lastUploadTime = Date.now();
    ext.reporter.sendTelemetryEvent('dockerfilesave', { "lineCount": doc.lineCount.toString() }, {});

    // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-floating-promises
    ext.ams?.recordActivity('overall');
}
