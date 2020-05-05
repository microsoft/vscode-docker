/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ActivityMeasurementService } from '../../extension.bundle';
import { TestMemento } from '../TestMemento';
import { assertSameDate } from '../assertEx';

suite('(unit) telemetry/ActivityMeasurementService', async () => {
    test('Default data returned', async () => {
        const ams = new ActivityMeasurementService(new TestMemento());

        const overallData = ams.getActivityMeasurement('overall');
        const overallNoEditData = ams.getActivityMeasurement('overallnoedit');

        assert.deepEqual(overallData, overallNoEditData);

        assert.equal(overallData.lastSession, undefined);
        assert.equal(overallData.totalSessions, 0);
        assert.equal(overallData.currentMonthSessions, 0);
    });

    test('overall increments overall only', async () => {
        const ams = new ActivityMeasurementService(new TestMemento());

        await ams.recordActivity('overall');

        const overallData = ams.getActivityMeasurement('overall');
        const overallNoEditData = ams.getActivityMeasurement('overallnoedit');

        assert.notDeepEqual(overallData, overallNoEditData);

        assertSameDate(overallData.lastSession, Date.now());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);
    });

    test('overallnoedit increments both', async () => {
        const ams = new ActivityMeasurementService(new TestMemento());

        await ams.recordActivity('overallnoedit');

        const overallData = ams.getActivityMeasurement('overall');
        const overallNoEditData = ams.getActivityMeasurement('overallnoedit');

        assertSameDate(overallData.lastSession, Date.now());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);

        assertSameDate(overallNoEditData.lastSession, Date.now());
        assert.equal(overallNoEditData.totalSessions, 1);
        assert.equal(overallNoEditData.currentMonthSessions, 1);
    });

    test('Record is once per day', async () => {
        const ams = new ActivityMeasurementService(new TestMemento());

        await ams.recordActivity('overall');
        await ams.recordActivity('overall');

        const overallData = ams.getActivityMeasurement('overall');

        assertSameDate(overallData.lastSession, Date.now());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);
    });

    test('Loading from storage', async () => {
        const memento = new TestMemento();
        const ams1 = new ActivityMeasurementService(memento);
        await ams1.recordActivity('overallnoedit');

        // Get a new object without memory
        const ams2 = new ActivityMeasurementService(memento);

        const overallData = ams2.getActivityMeasurement('overall');
        const overallNoEditData = ams2.getActivityMeasurement('overallnoedit');

        assertSameDate(overallData.lastSession, Date.now());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);

        assertSameDate(overallNoEditData.lastSession, Date.now());
        assert.equal(overallNoEditData.totalSessions, 1);
        assert.equal(overallNoEditData.currentMonthSessions, 1);
    });
});
