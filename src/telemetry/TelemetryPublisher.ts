import * as vscode from 'vscode';
import { TelemetryProperties } from 'vscode-azureextensionui';

export interface TelemetryEvent {
    eventName: string;
    properties?: TelemetryProperties;
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
