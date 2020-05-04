/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ext, ActivityMeasurementService } from '../../extension.bundle';

suite('(unit) telemetry/ActivityMeasurementService', async () => {
    await test('Default data returned', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.deepEqual(overallData, overallNoEditData);

        assert.equal(overallData.lastSession, undefined);
        assert.equal(overallData.totalSessions, 0);
        assert.equal(overallData.currentMonthSessions, 0);
    });

    await test('overall increments overall only', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overall');

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.notDeepEqual(overallData, overallNoEditData);

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);
    });

    await test('overallnoedit increments both', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overallnoedit');

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);

        assert.equal(new Date(overallNoEditData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallNoEditData.totalSessions, 1);
        assert.equal(overallNoEditData.currentMonthSessions, 1);
    });

    await test('Record is once per day', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overall');
        await ext.activityMeasurementService.recordActivity('overall');

        const overallData = ext.activityMeasurementService.getActivity('overall');

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);
    });

    await test('Loading from storage', async () => {
        ext.activityMeasurementService.recordActivity('overallnoedit');

        // Get a new object to wipe its memory
        ext.activityMeasurementService = new ActivityMeasurementService(ext.context.globalState);

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.currentMonthSessions, 1);

        assert.equal(new Date(overallNoEditData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallNoEditData.totalSessions, 1);
        assert.equal(overallNoEditData.currentMonthSessions, 1);
    });
});
