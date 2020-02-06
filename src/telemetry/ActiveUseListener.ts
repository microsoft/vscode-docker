/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ITelemetryPublisher } from './TelemetryPublisher';

const lastActivationDateKey = 'ActiveUseListener.lastActivationDate';
const lastUseDateKey = 'ActiveUseListener.lastUseDate';

export default class ActiveUseListener extends vscode.Disposable {
    private readonly listener: vscode.Disposable;

    private lastActivationDate: string | undefined;
    private lastUseDate: string | undefined;

    public constructor(publisher: ITelemetryPublisher, state: vscode.Memento) {
        super(() => { this.listener.dispose(); });

        this.listener = publisher.onEvent(
            event => {
                const eventDate = new Date().toDateString();

                if (event.properties?.isActivationEvent === 'true') {
                    if (this.lastActivationDate !== eventDate) {
                        this.lastActivationDate = eventDate;

                        // NOTE: Ignore failures to update (as we'll try again next time).
                        state.update(lastActivationDateKey, this.lastActivationDate).then(() => {}, () => {});
                    }
                } else {
                    if (this.lastUseDate !== eventDate) {
                        this.lastUseDate = eventDate;

                        // NOTE: Ignore failures to update (as we'll try again next time).
                        state.update(lastUseDateKey, this.lastUseDate).then(() => {}, () => {});
                    }
                }
            });
    }
}
