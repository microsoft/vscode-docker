/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface TelemetryEvent {
    eventName: string;
    measurements?: { [key: string]: number };
    properties?: { [key: string]: string };
}

export interface ITelemetryPublisher {
    onEvent: vscode.Event<TelemetryEvent>;
    publishEvent(event: TelemetryEvent): void;
}

export default class TelemetryPublisher extends vscode.Disposable implements ITelemetryPublisher {
    private readonly onEventEmitter: vscode.EventEmitter<TelemetryEvent>;

    public constructor() {
        super(() => this.onEventEmitter.dispose());

        this.onEventEmitter = new vscode.EventEmitter<TelemetryEvent>();
    }

    public get onEvent(): vscode.Event<TelemetryEvent> {
        return this.onEventEmitter.event;
    }

    public publishEvent(event: TelemetryEvent): void {
        this.onEventEmitter.fire(event);
    }
}
