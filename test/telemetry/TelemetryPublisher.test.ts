/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

import { TelemetryPublisher } from '../../extension.bundle';

suite('telemetry/TelemetryPublisher', () => {
    test('Listeners are notified of published events', () => {
        const eventName = 'event';
        const measurements = {};
        const properties = {};

        let wasPublished = false;

        const publisher = new TelemetryPublisher();

        publisher.onEvent(
            e => {
                assert.equal(e.eventName, eventName);
                assert.equal(e.measurements, measurements);
                assert.equal(e.properties, properties);

                wasPublished = true;
            });

        publisher.publishEvent({ eventName, measurements, properties });

        assert(wasPublished);
    });
});
