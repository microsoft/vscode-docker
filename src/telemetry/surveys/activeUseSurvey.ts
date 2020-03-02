/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ITelemetryPublisher } from '../TelemetryPublisher';

const surveyUrl = 'https://aka.ms/vscodedockeractiveusesurvey';
const lastUseDateKey = 'telemetry.surveys.activeUseSurvey.lastUseDate';
const isCandidateKey = 'telemetry.surveys.activeUseSurvey.isCandidate';
const useLimitInDays = 22;

function getIsoDateString(date: Date): string {
    const isoString = date.toISOString();

    return isoString.split('T')[0];
}

function getIsoDate(clock: () => Date): Date {
    const now = clock();
    const isoDateString = getIsoDateString(now);

    return new Date(isoDateString);
}

function isEnglishLanguage(): boolean {
    return vscode.env.language === 'en' || vscode.env.language.startsWith('en-');
}

function select25Percent(): boolean {
    // tslint:disable-next-line: insecure-random
    return Math.random() < 0.25; // Select 25% of eligible candidates.
}

async function surveyPrompt(): Promise<boolean> {
    const prompt = localize('vscode-docker.survey.active.prompt', 'We noticed you haven’t used the Docker extension lately, would you take a quick survey?');
    const yes = { title: localize('vscode-docker.survey.active.yes', 'Yes') };
    const no = { title: localize('vscode-docker.survey.active.no', 'No') };

    const result = (await vscode.window.showInformationMessage(prompt, yes, no)) ?? no;

    return result === yes;
}

async function surveyOpen(): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(`${surveyUrl}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(vscode.env.machineId)}`));
}

function tryUpdate(state: vscode.Memento, key: string, value: unknown): void {
    state.update(lastUseDateKey, value).then(() => { }, () => { });
}

function sendSurveyTelemetryEvent(eventName: string, properties?: { [key: string]: string }): void {
    // NOTE: isActivationEvent must be 'true' to avoid survey telemetry being counted as "real" use.
    ext.reporter.sendTelemetryEvent(eventName, { isActivationEvent: 'true', ...(properties ?? {}) });
}

export class ActiveUseSurveyDisposable extends vscode.Disposable {
    public constructor(public readonly postActivationTask: Promise<void>, postActivationTimer: NodeJS.Timeout, telemetryListener: vscode.Disposable) {
        super(
            () => {
                clearTimeout(postActivationTimer);

                telemetryListener.dispose();
            });
    }
}

// tslint:disable-next-line: max-func-body-length
export function activeUseSurvey(activationDelay: number, clock: () => Date, isChosenLanguage: () => boolean, publisher: ITelemetryPublisher, selector: () => boolean, state: vscode.Memento, promptForSurvey: () => Promise<boolean>, openSurvey: () => Promise<void>): ActiveUseSurveyDisposable {
    try {
        const activationDate = getIsoDate(clock);

        const lastUseDateString = state.get<string>(lastUseDateKey);

        let lastUseDate: Date;

        if (lastUseDateString) {
            lastUseDate = new Date(lastUseDateString);
        } else {
            //
            // This is (likely) the first activation of the extension; consider "last use" to be the same as this activation date, for use in future activations.
            //

            lastUseDate = activationDate;

            tryUpdate(state, lastUseDateKey, getIsoDateString(lastUseDate));
        }

        //
        // If the user invoked a command that caused the extension to be activated, the activation would be followed by activation events and then "real use" events.
        // It would be weird to ask the user "why aren't you using our tools" immediately after the user *just used our tools*. Hence, we wait for a period to allow
        // those events to flow through, potentially resetting the last use date, before checking whether the survey prompt is needed.
        //

        let postActivationTimer: NodeJS.Timeout;

        const postActivationTask = new Promise<void>(
            resolve => {
                postActivationTimer = setTimeout(
                    async () => {
                        try {
                            const activationTime = activationDate.getTime();
                            const lastUseTime = lastUseDate.getTime();
                            const useLimitTime = useLimitInDays * 24 * 60 * 60 * 1000; // day * hour/day * min/hour * sec/min * ms/sec
                            const inactiveTime = activationTime - lastUseTime;

                            // Has it been more than X number of days since the last "real use" by the user?
                            if (inactiveTime >= useLimitTime) {
                                sendSurveyTelemetryEvent('surveys.activeUseSurvey.inactive', { inactiveTimeInMs: inactiveTime.toString() })

                                // Is the user a known candidate (or not)?
                                let isCandidate = state.get<boolean>(isCandidateKey);

                                // If undecided, run the user through the selection process...
                                if (isCandidate === undefined) {
                                    isCandidate = selector();

                                    // ...and update the user as a known candidate (or not).
                                    await state.update(isCandidateKey, isCandidate);
                                }

                                // Is the user (assumed to be) a speaker of the survey-chosen language?
                                // NOTE: The user remains a candidate in case she switches languages.
                                if (!isChosenLanguage()) {
                                    isCandidate = false;
                                }

                                // Is the user still considered a candidate?
                                if (isCandidate) {
                                    sendSurveyTelemetryEvent('surveys.activeUseSurvey.eligibleCandidate');

                                    const response = await promptForSurvey();

                                    // Regardless of the response, user is no longer a candidate.
                                    await state.update(isCandidateKey, false);

                                    //
                                    // NOTE: The prompt only resolves if the user actually responds.
                                    //

                                    if (response) {
                                        await openSurvey();
                                    }

                                    sendSurveyTelemetryEvent('surveys.activeUseSurvey.response', { response: response.toString() });
                                }
                            }
                        } catch {
                            // NOTE: Best effort.
                        }

                        resolve();
                    },
                    activationDelay);
            });

        const telemetryListener = publisher.onEvent(
            event => {
                try {
                    if (event.properties?.isActivationEvent !== 'true') {
                        const eventDate = getIsoDate(clock);

                        if (lastUseDate.getTime() !== eventDate.getTime()) {
                            lastUseDate = eventDate;

                            tryUpdate(state, lastUseDateKey, getIsoDateString(lastUseDate));
                        }
                    }
                } catch {
                    // NOTE: Best effort.
                }
            });

        return new ActiveUseSurveyDisposable(postActivationTask, postActivationTimer, telemetryListener);
    } catch {
        // NOTE: Best effort.
    }
}

export function registerActiveUseSurvey(publisher: ITelemetryPublisher, state: vscode.Memento): ActiveUseSurveyDisposable {
    return activeUseSurvey(
        60 * 1000,                  // Check for eligibility 1 minute after activation.
        () => new Date(),           // Use the current clock (i.e. date).
        isEnglishLanguage,
        publisher,
        select25Percent,
        state,
        surveyPrompt,
        surveyOpen);
}
