/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.md in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { activeUseSurvey } from '../../../extension.bundle';
import { TelemetryEvent } from '../../../extension.bundle';
import { ITelemetryPublisher } from '../../../src/telemetry/TelemetryPublisher';

interface TelemetryEventData {
    date: string;
    event: TelemetryEvent;
};

interface TestOptions {
    activationDate: string;
    lastUseDate?: string;
    isCandidate?: boolean;
    isSelected?: boolean;
    isChosenLanguage?: boolean;
    promptResponse?: boolean;
    preActivationTelemetry?: TelemetryEventData[];
    postActivationTelemetry?: TelemetryEventData[];
}

suite('(unit) telemetry/surveys/activeUseSurvey', () => {
    const lastUseDateKey = 'telemetry.surveys.activeUseSurvey.lastUseDate';
    const isCandidateKey = 'telemetry.surveys.activeUseSurvey.isCandidate';

    function buildTest(name: string, options: TestOptions) {
        test(name, async () => {
            const eventPublisher = new vscode.EventEmitter<TelemetryEvent>()

            const publisher: ITelemetryPublisher = {
                onEvent: eventPublisher.event,
                publishEvent: undefined
            };

            const lastUseDateUpdates = [];
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
                        case lastUseDateKey:
                            lastUseDateUpdates.push(value);
                            break;

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

            const nonActivationPostActivationTelemetry = (options.postActivationTelemetry ?? []).filter(telemetry => telemetry.event.properties?.isActivationEvent !== 'true');

            const dates = [
                new Date(options.activationDate),
                ...(options.preActivationTelemetry ?? []).map(event => new Date(event.date)),
                ...nonActivationPostActivationTelemetry.map(event => new Date(event.date))
            ];

            const clock = () => {
                return dates.shift();
            };

            const survey =
                activeUseSurvey(
                    10,
                    clock,
                    () => options.isChosenLanguage ?? true,
                    publisher,
                    selector,
                    state,
                    surveyPrompt,
                    surveyOpen);

            if (options.preActivationTelemetry) {
                options.preActivationTelemetry.forEach(telemetry => eventPublisher.fire(telemetry.event));
            }

            await survey.postActivationTask;

            if (options.postActivationTelemetry) {
                options.postActivationTelemetry.forEach(telemetry => eventPublisher.fire(telemetry.event));
            }

            // If this was the first activation, the "last use" should be set to the activation date.
            if (options.lastUseDate === undefined) {
                assert(lastUseDateUpdates.length === 1 && lastUseDateUpdates[0] === options.activationDate);
            }

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

            // The last use update should be the last non-activation-event telemetry date.
            if (nonActivationPostActivationTelemetry.length > 0) {
                assert(lastUseDateUpdates.length > 0 && lastUseDateUpdates[lastUseDateUpdates.length - 1] === nonActivationPostActivationTelemetry[nonActivationPostActivationTelemetry.length - 1].date);
            }

            assert((options.isSelected !== undefined && wasSelected) || (options.isSelected === undefined && !wasSelected));
            assert((options.promptResponse !== undefined && wasPrompted) || (options.promptResponse === undefined && !wasPrompted));
            assert((options.promptResponse === true && wasOpened) || (options.promptResponse !== true && !wasOpened));
        });
    }

    buildTest('First activation, no use', { activationDate: '2020-01-24' });

    buildTest('Activation, no use, previous use within limits', { activationDate: '2020-01-24', lastUseDate: '2020-01-03' });

    buildTest('Activation, no use, previous use within limits, with post non-activation events', { activationDate: '2020-01-20', lastUseDate: '2020-01-03', postActivationTelemetry: [{ date: '2020-01-21', event: { eventName: 'docker-build' } }, { date: '2020-01-22', event: { eventName: 'docker-build' } }] });

    buildTest('Activation, no use, previous use within limits, with post activation events', { activationDate: '2020-01-20', lastUseDate: '2020-01-03', postActivationTelemetry: [{ date: '2020-01-21', event: { eventName: 'docker-build', properties: { 'isActivationEvent': 'true' } } }] });

    buildTest('Activation, no use, previous use outside limits, not candidate', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: false });

    /* Temporarily disabled (the survey is disabled but counting isn't, response is not possible)
    buildTest('Activation, no use, previous use outside limits, candidate, negative response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: true, promptResponse: false });

    buildTest('Activation, no use, previous use outside limits, candidate, positive response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isCandidate: true, promptResponse: true });
    */

    buildTest('Activation, no use, previous use outside limits, unknown candidate, not selected', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: false });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, non-native language', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, isChosenLanguage: false });

    /* Temporarily disabled (the survey is disabled but counting isn't, response is not possible)
    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, negative response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: false });

    buildTest('Activation, no use, previous use outside limits, unknown candidate, selected, positive response', { activationDate: '2020-01-24', lastUseDate: '2020-01-01', isSelected: true, promptResponse: true });

    buildTest('Activation, no use, previous use at limits, unknown candidate, selected, positive response', { activationDate: '2020-01-23', lastUseDate: '2020-01-01', isSelected: true, promptResponse: true });
    */
});

