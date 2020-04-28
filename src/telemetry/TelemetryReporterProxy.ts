/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryReporter } from "vscode-azureextensionui";
import { ITelemetryPublisher } from "./TelemetryPublisher";

export class TelemetryReporterProxy implements ITelemetryReporter {
    public constructor(
        private readonly publisher: ITelemetryPublisher,
        private readonly wrappedReporter: ITelemetryReporter) {
    }

    public sendTelemetryEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }): void {
        this.wrappedReporter.sendTelemetryEvent(eventName, properties, measurements);

        this.publisher.publishEvent({
            eventName,
            measurements,
            properties
        });
    }

    public sendTelemetryErrorEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }): void {
        // eslint-disable-next-line @typescript-eslint/tslint/config
        this.wrappedReporter.sendTelemetryErrorEvent(eventName, properties, measurements);

        this.publisher.publishEvent({
            eventName,
            measurements,
            properties
        });
    }
}
