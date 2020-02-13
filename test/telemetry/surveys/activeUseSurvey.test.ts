/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { activeUseSurvey } from '../../../extension.bundle';
import { TelemetryEvent } from '../../../extension.bundle';
import { ITelemetryPublisher } from '../../../src/telemetry/TelemetryPublisher';

suite('telemetry/surveys/activeUseSurvey', () => {
    const lastUseDateKey = 'telemetry.surveys.activeUseSurvey.lastUseDate';
    const isCandidateKey = 'telemetry.surveys.activeUseSurvey.isCandidate';

    test('First activation with no use', async () => {
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

        const survey =
            activeUseSurvey(
                0,
                () => new Date(),
                publisher,
                () => true,
                state,
                () => Promise.resolve(true),
                () => Promise.resolve());

        await survey.postActivationTask;
    });

    test('Activation with no use and previous use within limits', async () => {
        const currentDate = Date.parse('2020-02-12');

        const eventPublisher = new vscode.EventEmitter<TelemetryEvent>()

        const publisher: ITelemetryPublisher = {
            onEvent: eventPublisher.event,
            publishEvent: undefined
        };

        const state: vscode.Memento = {
            get: key => {
                return '2020-02-11';
            },
            update: (key, value) => {
                return Promise.resolve();
            }
        }

        let wasSelected = false;
        let wasPrompted = false;
        let wasOpened = false;

        const selector = () => {
            wasSelected = true;

            return false;
        };

        const surveyPrompt = () => {
            wasPrompted = true;

            return new Promise<boolean>(() => {});
        };

        const surveyOpen = () => {
            wasOpened = true;

            return Promise.resolve();
        }

        const survey =
            activeUseSurvey(
                0,
                () => new Date(currentDate),
                publisher,
                selector,
                state,
                surveyPrompt,
                surveyOpen);

        await survey.postActivationTask;

        assert(!wasSelected);
        assert(!wasPrompted);
        assert(!wasOpened);
    });

    test('Activation with no use and previous use outside limits', async () => {
        const currentDate = Date.parse('2020-01-24');

        const eventPublisher = new vscode.EventEmitter<TelemetryEvent>()

        const publisher: ITelemetryPublisher = {
            onEvent: eventPublisher.event,
            publishEvent: undefined
        };

        const state: vscode.Memento = {
            get: (key, defaultValue = undefined) => {
                switch (key) {
                    case lastUseDateKey: return '2020-01-01';
                    case isCandidateKey: return defaultValue;
                }

                return undefined;
            },
            update: (key, value) => {
                return Promise.resolve();
            }
        }

        let wasSelected = false;
        let wasPrompted = false;
        let wasOpened = false;

        const selector = () => {
            wasSelected = true;

            return true;
        };

        const surveyPrompt = () => {
            wasPrompted = true;

            return Promise.resolve(true);
        };

        const surveyOpen = () => {
            wasOpened = true;

            return Promise.resolve();
        }

        const survey =
            activeUseSurvey(
                0,
                () => new Date(currentDate),
                publisher,
                selector,
                state,
                surveyPrompt,
                surveyOpen);

        await survey.postActivationTask;

        assert(wasSelected);
        assert(wasPrompted);
        assert(wasOpened);
    });
});

