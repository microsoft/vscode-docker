/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITelemetryReporter } from 'vscode-azureextensionui';
import { IExperimentationTelemetry } from 'vscode-tas-client';

export class TelemetryReporterProxy implements ITelemetryReporter, IExperimentationTelemetry {
    private readonly sharedProperties: { [key: string]: string } = {};

    public constructor(
        private readonly wrappedReporter: ITelemetryReporter) {
    }

    public sendTelemetryEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }): void {
        for (const key of Object.keys(this.sharedProperties)) {
            if (properties[key]) {
                console.error('Local telemetry property will be overwritten by shared property.');
            }

            properties[key] = this.sharedProperties[key];
        }

        this.wrappedReporter.sendTelemetryEvent(eventName, properties, measurements);
    }

    public postEvent(eventName: string, props: Map<string, string>): void {
        const properties: { [key: string]: string } = {};

        for (const key of props.keys()) {
            properties[key] = props.get(key);
        }

        this.sendTelemetryEvent(eventName, properties);
    }

    public setSharedProperty(name: string, value: string): void {
        this.sharedProperties[name] = value;
    }
}
