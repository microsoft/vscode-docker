/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { createTelemetryReporter, ITelemetryReporter } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';

export let reporter: ITelemetryReporter;

export function initializeTelemetryReporter(newReporter: ITelemetryReporter): void {
    reporter = newReporter;
}
