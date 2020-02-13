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
    isChosenLanguage?: boolean;
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

            const isCandidateUpdates = [];

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
                            isCandidateUpdates.push(value);
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
                    () => options.isChosenLanguage ?? true,
                    publisher,
                    selector,
                    state,
                    surveyPrompt,
                    surveyOpen);

            await survey.postActivationTask;

            // If the user is a known candidate, she should not go through the selection process.
            if (options.isCandidate !== undefined) {
                assert(!wasSelected);
            }

            // If the user was selected, their candidicy should first be saved.
            if (options.isCandidate === undefined && options.isSelected !== undefined) {
                assert(isCandidateUpdates.length > 0 && isCandidateUpdates[0] === options.isSelected);
            }

            // If the user responded, their candidicy should lastly be revoked.
            if (options.promptResponse !== undefined) {
                assert(isCandidateUpdates.length > 0 && isCandidateUpdates[isCandidateUpdates.length - 1] === false);
            }

            assert((options.isSelected !== undefined && wasSelected) || (options.isSelected === undefined && !wasSelected));
            assert((options.promptResponse !== undefined && wasPrompted) || (options.promptResponse === undefined && !wasPrompted));
            assert((options.promptResponse === true && wasOpened) || (options.promptResponse !== true && !wasOpened));
        });
    }

    buildTest('First activation, no use', { activationDate: '2020-01-24' });

    buildTest('Activation, no use, previous use within limits', { activationDate: '2020-01-24', lastUseDate: '2020-01-03' });

    buildTest('Activation, no use, previous use outside limits, not candidate', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: false });

    buildTest('Activation, no use, previous use outside limits, candidate, negative response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: true, promptResponse: false });

    buildTest('Activation, no use, previous use outside limits, candidate, positive response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: true, promptResponse: true });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, not selected', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: false });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, non-native language', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, isChosenLanguage: false });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, negative response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: false });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, positive response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: true });

    buildTest('Activation, no use, previous use at limits, unknown candidate, selected, positive response', { activationDate: '2020-01-23', lastUseDate: '2020-01-01', isSelected: true, promptResponse: true });
});

