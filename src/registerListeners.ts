/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, workspace } from 'vscode';
import { IActionContext, registerEvent } from 'vscode-azureextensionui';
import { ext } from './extensionVariables';

let lastUploadTime: number = 0;
const hourInMilliseconds = 1000 * 60 * 60;

export function registerListeners(): void {
    if (ext.telemetryOptIn) {
        registerEvent('dockerfilesave', workspace.onDidSaveTextDocument, async (context: IActionContext, doc: TextDocument) => {
            // If it's not a Dockerfile, or last upload time is within an hour, skip
            if (doc.languageId !== 'dockerfile' || lastUploadTime + hourInMilliseconds > Date.now()) {
                context.telemetry.suppressAll = true;
                return;
            }

            lastUploadTime = Date.now();
            context.telemetry.properties.lineCount = doc.lineCount.toString();

            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overall');
        });
    }
}
