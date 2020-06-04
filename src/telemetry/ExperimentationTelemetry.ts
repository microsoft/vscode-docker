/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { IExperimentationTelemetry } from 'vscode-tas-client';

export class ExperimentationTelemetry implements IExperimentationTelemetry {
    private readonly sharedProperties: { [key: string]: string } = {};

    /**
     * "Handles" telemetry events by adding the shared properties to them
     * @param context The action context
     */
    public async handleTelemetry(context: IActionContext): Promise<void> {
        // Copy shared properties into event properties
        for (const key of Object.keys(this.sharedProperties)) {
            if (context.telemetry.properties[key]) {
                console.warn(`Local telemetry property '${key}' will be overwritten by shared property!`);
            }

            context.telemetry.properties[key] = this.sharedProperties[key];
        }
    }

    /**
     * Implements `postEvent` for `IExperimentationTelemetry`.
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

            // Treat the TAS query event as activation
            if (/query-expfeature/i.test(eventName)) {
                context.telemetry.properties.isActivationEvent = 'true';
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
