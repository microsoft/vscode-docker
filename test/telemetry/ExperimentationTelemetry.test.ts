/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ExperimentationTelemetry } from '../../extension.bundle';
import { IActionContext } from 'vscode-azureextensionui';

suite('(unit) telemetry/ExperimentationTelemetry', async () => {
    test('Shared properties get attached', async () => {
        const et = new ExperimentationTelemetry();
        et.setSharedProperty('mySharedProperty', 'mySharedValue');

        const ctx: IActionContext = {
            telemetry: {
                properties: {},
                measurements: {},
            },
            errorHandling: {
                issueProperties: {},
            },
        };

        await et.handleTelemetry(ctx);

        assert.equal(ctx.telemetry.properties['mySharedProperty'], 'mySharedValue');
    });
});
