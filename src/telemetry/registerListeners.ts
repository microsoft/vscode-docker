/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, registerEvent } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';

export function registerListeners(): void {
    if (vscode.env.isTelemetryEnabled) {
        registerEvent('dockerfilesave', vscode.workspace.onDidSaveTextDocument, async (context: IActionContext, doc: vscode.TextDocument) => {
            // If it's not a Dockerfile, skip
            if (doc.languageId !== 'dockerfile') {
                context.telemetry.suppressAll = true;
                return;
            }

            context.telemetry.properties.lineCount = doc.lineCount.toString();

            void ext.activityMeasurementService.recordActivity('overall');
        });

        registerEvent('composefilesave', vscode.workspace.onDidSaveTextDocument, async (context: IActionContext, doc: vscode.TextDocument) => {
            // If it's not a compose file, skip
            if (doc.languageId !== 'dockercompose') {
                context.telemetry.suppressAll = true;
                return;
            }

            context.telemetry.properties.lineCount = doc.lineCount.toString();

            void ext.activityMeasurementService.recordActivity('overall');
        });
    }
}
