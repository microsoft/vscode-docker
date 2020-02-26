/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

import { TelemetryReporterProxy } from '../../extension.bundle';
import { ITelemetryReporter } from 'vscode-azureextensionui';
import { ITelemetryPublisher } from '../../extension.bundle';

suite('(unit) telemetry/TelemetryReporterProxy', () => {
    test('Events sent to both reporter and publisher', () => {
        const eventName = 'event';
        const measurements = {};
        const properties = {};

        let eventPublished = false;
        let eventSent = false;

        const publisher: ITelemetryPublisher = {
            onEvent: undefined,
            publishEvent: e => {
                assert.equal(e.eventName, eventName);
                assert.equal(e.measurements, measurements);
                assert.equal(e.properties, properties);

                eventPublished = true;
            }
        };

        const wrappedReporter: ITelemetryReporter = {
            sendTelemetryEvent: (e, p, m) => {
                assert.equal(e, eventName);
                assert.equal(m, measurements);
                assert.equal(p, properties);

                eventSent = true;
            }
        };

        const proxy = new TelemetryReporterProxy(publisher, wrappedReporter);

        proxy.sendTelemetryEvent(eventName, properties, measurements);

        assert(eventPublished);
        assert(eventSent);
    });
});
