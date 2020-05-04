/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext, ITelemetryReporter } from 'vscode-azureextensionui';
import { IExperimentationTelemetry } from 'vscode-tas-client';

export class TelemetryReporterProxy implements ITelemetryReporter, IExperimentationTelemetry {
    private readonly sharedProperties: { [key: string]: string } = {};

    public constructor(private readonly wrappedReporter: ITelemetryReporter) {
    }

    public sendTelemetryErrorEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }, errorProps?: string[]): void {
        properties = properties ?? {};

        for (const key of Object.keys(this.sharedProperties)) {
            if (properties[key]) {
                console.error('Local telemetry property will be overwritten by shared property.');
            }

            properties[key] = this.sharedProperties[key];
        }

        this.wrappedReporter.sendTelemetryErrorEvent(eventName, properties, measurements, errorProps);
    }

    /**
     * "Handles" telemetry events by adding the shared properties to them
     * @param eventName The name of the event
     * @param context The action context
     */
    public async handleTelemetry(eventName: string, context: IActionContext): Promise<void> {
        // Copy shared properties into event properties
        for (const key of Object.keys(this.sharedProperties)) {
            if (context.telemetry.properties[key]) {
                console.error('Local telemetry property will be overwritten by shared property.');
            }

            context.telemetry.properties[key] = this.sharedProperties[key];
        }
    }

    /**
     * Implements `postEvent` for `IExperimentationTelemetry`. This implementation is admittedly strange, but necessary since `ITelemetryReporter` is no longer public.
     * @param eventName The name of the event
     * @param props The properties to attach to the event
     */
    public postEvent(eventName: string, props: Map<string, string>): void {
        // This implementation is admittedly strange, but necessary since ITelemetryReporter is no longer public
        callWithTelemetryAndErrorHandling(eventName, (context: IActionContext) => {
            // Copy `Map<string, string>` into `TelemetryProperties`
            for (const key of props.keys()) {
                context.telemetry.properties[key] = props.get(key);
            }
        }).then(() => { }, () => { }); // Best effort
    }

    /**
     * Implements `setSharedProperty` for `IExperimentationTelemetry`
     * @param name The name of the property
     * @param value The value of the property
     */
    public setSharedProperty(name: string, value: string): void {
        this.sharedProperties[name] = value;
    }
}
