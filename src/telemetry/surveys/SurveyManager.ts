/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';

// Currently-active surveys should be registered here
const currentSurveys: Survey[] = [
];

const surveyRespondedKeyPrefix = 'vscode-docker.surveys.response';
const surveyFlightPrefix = 'vscode-docker.surveys';
const lastToastedSessionKey = 'vscode-docker.surveys.lastSession';

// A random value between 0 and slushTime will be added to / subtracted from the activation delay
const slushTime = 3000;

export interface Survey {
    id: string;
    prompt: string;
    buttons: Map<string, string | undefined>;
    activationDelayMs: number;
    isEligible(): Promise<boolean>;
}

export class SurveyManager {
    public activate(): void {
        if (!vscode.env.isTelemetryEnabled) {
            return;
        }

        for (const survey of currentSurveys) {
            // Generate a slush of +/- 3 seconds
            const slush = Math.round(Math.random() * slushTime * 2) - slushTime;

            const timer = setTimeout(
                async () => {
                    clearTimeout(timer);
                    await this.executeSurvey(survey);
                },
                survey.activationDelayMs + slush
            );
        }
    }

    private async executeSurvey(survey: Survey): Promise<void> {
        try {
            const shouldShowPrompt: boolean = await callWithTelemetryAndErrorHandling('surveyCheck', async (context: IActionContext) => {
                context.telemetry.properties.surveyId = survey.id;
                context.telemetry.properties.isActivationEvent = 'true';

                const alreadyToasted = ext.context.globalState.get<string>(lastToastedSessionKey) === vscode.env.sessionId;
                const responded = ext.context.globalState.get<boolean>(`${surveyRespondedKeyPrefix}.${survey.id}`, false);
                const eligible = await survey.isEligible();
                const flighted = await ext.experimentationService.isCachedFlightEnabled(`${surveyFlightPrefix}.${survey.id}`);

                context.telemetry.properties.surveyAlreadyToasted = alreadyToasted.toString();
                context.telemetry.properties.surveyResponded = responded.toString();
                context.telemetry.properties.surveyEligible = eligible.toString();
                context.telemetry.properties.surveyFlighted = flighted.toString();

                return !alreadyToasted && !responded && eligible && flighted;
            });

            if (shouldShowPrompt) {
                await callWithTelemetryAndErrorHandling('surveyResponse', async (context: IActionContext) => {
                    context.telemetry.properties.surveyId = survey.id;
                    context.telemetry.properties.isActivationEvent = 'true';

                    const response = await this.surveyPrompt(survey);
                    context.telemetry.properties.surveyResponse = response ? 'true' : 'false';
                    context.telemetry.properties.surveyChoice = response;

                    if (response) {
                        await this.surveyOpen(response);
                    }
                });
            }
        } catch {
            // Best effort
        }
    }

    private async surveyOpen(url: string): Promise<void> {
        await vscode.env.openExternal(vscode.Uri.parse(`${url}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(vscode.env.machineId)}`));
    }

    private async surveyPrompt(survey: Survey): Promise<string | undefined> {
        await ext.context.globalState.update(`${surveyRespondedKeyPrefix}.${survey.id}`, true);
        await ext.context.globalState.update(lastToastedSessionKey, vscode.env.sessionId);

        const buttons = Array.from(survey.buttons.keys());

        const result = await vscode.window.showInformationMessage(survey.prompt, ...buttons);

        if (result === undefined) {
            return undefined;
        }

        return survey.buttons.get(result);
    }
}
