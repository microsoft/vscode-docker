/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ITelemetryPublisher } from './TelemetryPublisher';

export default class ActiveUseListener extends vscode.Disposable {
    private readonly listener: vscode.Disposable;

    public constructor(publisher: ITelemetryPublisher, state: vscode.Memento) {
        super(() => { this.listener.dispose(); });

        this.listener = publisher.onEvent(
            event => {
                if (event?.properties?.isActivationEvent === 'true') {
                    // Update last activation date.
                    console.log('Saw activation event!');
                } else {
                    // Update last use date.
                    console.log('Saw real use!');
                }
            });
    }
}
