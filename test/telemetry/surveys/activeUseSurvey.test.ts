/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { activeUseSurvey } from '../../../extension.bundle';
import { TelemetryEvent } from '../../../extension.bundle';
import { ITelemetryPublisher } from '../../../src/telemetry/TelemetryPublisher';

interface TestOptions {
    activationDate: string;
    lastUseDate?: string;
    isCandidate?: boolean;
    isSelected?: boolean;
    promptResponse?: boolean;
}

suite('telemetry/surveys/activeUseSurvey', () => {
    const lastUseDateKey = 'telemetry.surveys.activeUseSurvey.lastUseDate';
    const isCandidateKey = 'telemetry.surveys.activeUseSurvey.isCandidate';

    function buildTest(name: string, options: TestOptions) {
        test(name, async () => {
            const currentDate = Date.parse(options.activationDate);

            const eventPublisher = new vscode.EventEmitter<TelemetryEvent>()

            const publisher: ITelemetryPublisher = {
                onEvent: eventPublisher.event,
                publishEvent: undefined
            };

            let wasIsCandidateUpdated = false;

            const state: vscode.Memento = {
                get: (key, defaultValue = undefined) => {
                    switch (key) {
                        case lastUseDateKey: return options.lastUseDate ?? defaultValue;
                        case isCandidateKey: return options.isCandidate ?? defaultValue;
                    }

                    return defaultValue;
                },
                update: (key, value) => {
                    switch (key) {
                        case isCandidateKey:
                            wasIsCandidateUpdated = true;
                            assert(value === false);
                            break;
                    }

                    return Promise.resolve();
                }
            }

            let wasSelected = false;
            let wasPrompted = false;
            let wasOpened = false;

            const selector = () => {
                wasSelected = true;

                return options.isSelected;
            };

            const surveyPrompt = () => {
                wasPrompted = true;

                return Promise.resolve(options.promptResponse);
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

            assert((options.isSelected !== undefined && wasSelected) || (options.isSelected === undefined && !wasSelected));
            assert((options.promptResponse !== undefined && wasPrompted) || (options.promptResponse === undefined && !wasPrompted));
            assert((options.promptResponse === true && wasOpened) || (options.promptResponse !== true && !wasOpened));

            assert((options.promptResponse !== undefined && wasIsCandidateUpdated) || (options.promptResponse === undefined && !wasIsCandidateUpdated));
        });
    }

    buildTest('First activation, no use', { activationDate: '2020-01-24' });

    buildTest('Activation, no use, previous use within limits', { activationDate: '2020-01-24', lastUseDate: '2020-01-03' });

    buildTest('Activation, no use, previous use outside limits, not candidate', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: false });

    buildTest('Activation, no use, previous use outside limits, candidate, not selected', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: false });

    buildTest('Activation, no use, previous use outside limits, candidate, selected, negative response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: false });

    buildTest('Activation, no use, previous use outside limits, candidate, selected, positive response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: true });
});

