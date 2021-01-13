/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, workspace } from 'vscode';
import { IActionContext, registerEvent } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';

export function registerListeners(): void {
    if (ext.telemetryOptIn) {
        registerEvent('dockerfilesave', workspace.onDidSaveTextDocument, async (context: IActionContext, doc: TextDocument) => {
            // If it's not a Dockerfile, skip
            if (doc.languageId !== 'dockerfile') {
                context.telemetry.suppressAll = true;
                return;
            }

            context.telemetry.properties.lineCount = doc.lineCount.toString();

            void ext.activityMeasurementService.recordActivity('overall');
        });

        registerEvent('composefilesave', workspace.onDidSaveTextDocument, async (context: IActionContext, doc: TextDocument) => {
            // If it's not a compose file, skip
            if (!/compose.*\.ya?ml/i.test(doc.fileName)) {
                context.telemetry.suppressAll = true;
                return;
            }

            context.telemetry.properties.lineCount = doc.lineCount.toString();

            void ext.activityMeasurementService.recordActivity('overall');
        });
    }
}
