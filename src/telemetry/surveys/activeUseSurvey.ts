/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ITelemetryPublisher } from '../TelemetryPublisher';
import { ext } from 'vscode-azureappservice/out/src/extensionVariables';

// TODO: Verify aka.ms link.
const SURVEY_URL = 'https://aka.ms/vscodedockeractiveusesurvey';

const lastUseDateKey = 'activeUseSurvey.lastUseDate';
const isCandidateKey = 'activeUseSurvey.isCandidate';

function getDate(clock: () => Date): Date {
    const now = clock();

    return new Date(now.toDateString());
}

async function surveyPrompt(): Promise<boolean> {
    const prompt = 'Do you mind taking a quick feedback survey?';
    const yes = { title: 'Yes', response: 'yes' };
    const no = { title: 'No', response: 'no' };

    const result = (await vscode.window.showInformationMessage(prompt, yes, no)) ?? no;

    return result === yes;
}

async function openSurvey(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(`${SURVEY_URL}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(vscode.env.machineId)}`));
}

function tryUpdate(state: vscode.Memento, key: string, value: unknown): void {
    state.update(lastUseDateKey, value).then(() => {}, () => {});
}

export function activeUseSurvey(activationDelay: number, clock: () => Date, publisher: ITelemetryPublisher, selector: () => boolean, state: vscode.Memento, surveyPrompt: () => Promise<boolean>, surveyOpen: () => Promise<void>): vscode.Disposable {
    try {
        const activationDate = getDate(clock);

        const lastUseDateString = state.get<string>(lastUseDateKey);

        let lastUseDate: Date;

        if (lastUseDateString) {
            lastUseDate = new Date(lastUseDateString);
        } else {
            //
            // This is (likely) the first activation of the extension; consider "last use" to be the same as this activation date, for use in future activations.
            //

            lastUseDate = activationDate;

            tryUpdate(state, lastUseDateKey, lastUseDate.toDateString());
        }

        //
        // If the user invoked a command that caused the extension to be activated, the activation would be followed by activation events and then "real use" events.
        // It would be weird to ask the user "why aren't you using our tools" immediately after the user *just used our tools*. Hence, we wait for a period to allow
        // those events to flow through, potentially resetting the last use date, before checking whether the survey prompt is needed.
        //

        const postActivationTimer = setTimeout(
            async () => {
                try {
                    const activationTime = activationDate.getTime();
                    const lastUseTime = lastUseDate.getTime();
                    const period = 22 * 24 * 60 * 60 * 1000; // day * hour/day * min/hour * sec/min * ms/sec

                    // Has it been more than X number of days since the last "real use" by the user?
                    if (activationTime - lastUseTime > period) {
                        ext.reporter.sendTelemetryEvent('survey.activeUse', { isActivationEvent: 'true' });

                        // Is the user eligible (i.e. has not already responded to the prompt and has been (randomly) selected to be prompted)?
                        if (state.get(isCandidateKey, true) && selector()) {
                            ext.reporter.sendTelemetryEvent('survey.activeUse.eligible', { isActivationEvent: 'true' });

                            const response = await surveyPrompt();

                            //
                            // NOTE: The prompt only resolves if the user actually responds.
                            //

                            // Regardless of how the user responds, the user is no longer eligible.
                            await state.update(isCandidateKey, false);

                            if (response) {
                                await surveyOpen();
                            }

                            ext.reporter.sendTelemetryEvent('survey.activeUse.response', { isActivationEvent: 'true', response: response.toString() });
                        }
                    }
                } catch {
                    // NOTE: Best effort.
                }
            },
            activationDelay);

            const telemetryListener = publisher.onEvent(
                event => {
                    try {
                        if (event.properties?.isActivationEvent !== 'true') {
                            const eventDate = getDate(clock);

                            if (lastUseDate.getTime() !== eventDate.getTime()) {
                                lastUseDate = eventDate;

                                tryUpdate(state, lastUseDateKey, lastUseDate.toDateString());
                            }
                        }
                    } catch {
                        // NOTE: Best effort.
                    }
                });

        return new vscode.Disposable(
            () => {
                clearTimeout(postActivationTimer);

                telemetryListener.dispose();
            });
    } catch {
        // NOTE: Best effort.
    }
}

export function registerActiveUseSurvey(publisher: ITelemetryPublisher, state: vscode.Memento): vscode.Disposable {
    return activeUseSurvey(
        60 * 1000,                  // Check for eligibility 1 minute after activation.
        () => new Date(),           // Use the current clock (i.e. date).
        publisher,
        () => Math.random() < 0.25, // Select 25% of eligible candidates.
        state,
        surveyPrompt,
        openSurvey);
}
