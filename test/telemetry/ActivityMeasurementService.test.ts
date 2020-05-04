/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ext } from '../../extension.bundle';

suite('(unit) telemetry/ActivityMeasurementService', async () => {
    test('Default data returned', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.deepStrictEqual(overallData, overallNoEditData);

        assert.equal(overallData.lastSession, undefined);
        assert.equal(overallData.totalSessions, 0);
        assert.equal(overallData.monthlySessions, 0);
    });

    test('overall increments overall only', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overall');

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.notDeepStrictEqual(overallData, overallNoEditData);

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.monthlySessions, 1);
    });

    test('overallnoedit increments both', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overallnoedit');

        const overallData = ext.activityMeasurementService.getActivity('overall');
        const overallNoEditData = ext.activityMeasurementService.getActivity('overallnoedit');

        assert.deepStrictEqual(overallData, overallNoEditData);

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.monthlySessions, 1);
    });

    test('Record is once per day', async () => {
        // Clear existing data
        await ext.context.globalState.update('vscode-docker.activity.overall', undefined);
        await ext.context.globalState.update('vscode-docker.activity.overallnoedit', undefined);

        await ext.activityMeasurementService.recordActivity('overall');
        await ext.activityMeasurementService.recordActivity('overall');

        const overallData = ext.activityMeasurementService.getActivity('overall');

        assert.equal(new Date(overallData.lastSession).getDate(), new Date(Date.now()).getDate());
        assert.equal(overallData.totalSessions, 1);
        assert.equal(overallData.monthlySessions, 1);
    });
});
