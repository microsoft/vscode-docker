/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { activeUseSurvey } from '../../../extension.bundle';
import { TelemetryEvent } from '../../../extension.bundle';
import { ITelemetryPublisher } from '../../../src/telemetry/TelemetryPublisher';

suite('telemetry/surveys/activeUseSurvey', () => {
    test('First activation, no use', () => {
        const eventPublisher = new vscode.EventEmitter<TelemetryEvent>()

        const publisher: ITelemetryPublisher = {
            onEvent: eventPublisher.event,
            publishEvent: undefined
        };

        const state: vscode.Memento = {
            get: key => {
                return undefined;
            },
            update: (key, value) => {
                return Promise.resolve();
            }
        }

        return new Promise(
            (resolve, reject) => {
                activeUseSurvey(
                    0,
                    () => new Date(),
                    publisher,
                    () => true,
                    state,
                    () => Promise.resolve(true),
                    () => Promise.resolve());

                setImmediate(
                    () => {
                        resolve();
                    });
            });
    });
});

