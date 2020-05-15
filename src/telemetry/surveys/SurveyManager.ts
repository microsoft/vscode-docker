/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { nps2 } from './nps2';

// Currently-active surveys should be registered here
const currentSurveys = [nps2];

const surveyRespondedKeyPrefix = 'vscode-docker.surveys.response';
const surveyFlightPrefix = 'vscode-docker.surveys';

export interface Survey {
    id: string;
    url: string;
    prompt: string;
    activationDelayMs: number;
    isEligible(): Promise<boolean>;
}

export class SurveyManager {
    public activate(): void {
        if (!ext.telemetryOptIn) {
            return;
        }

        for (const survey of currentSurveys) {
            const timer = setTimeout(
                async () => {
                    clearTimeout(timer);
                    await this.executeSurvey(survey);
                },
                survey.activationDelayMs
            );
        }
    }

    private async executeSurvey(survey: Survey): Promise<void> {
        try {
            if (await this.shouldShowPrompt(survey)) {
                await callWithTelemetryAndErrorHandling('surveyResponse', async (context: IActionContext) => {
                    context.telemetry.properties.surveyId = survey.id;

                    const response = await this.surveyPrompt(survey);
                    context.telemetry.properties.surveyResponse = response.toString();

                    if (response) {
                        await this.surveyOpen(survey);
                    }
                });
            }
        } catch { } // Best effort
    }

    private async surveyOpen(survey: Survey): Promise<void> {
        await vscode.env.openExternal(vscode.Uri.parse(`${survey.url}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(vscode.env.machineId)}`));
    }

    private async surveyPrompt(survey: Survey): Promise<boolean> {
        await ext.context.globalState.update(`${surveyRespondedKeyPrefix}.${survey.id}`, true);

        const take = localize('vscode-docker.survey.nps.take', 'Take Survey');
        const never = localize('vscode-docker.survey.nps.never', 'Don\'t Ask Again');
        const result = await vscode.window.showInformationMessage(survey.prompt, take, never);

        return result === take;
    }

    private async shouldShowPrompt(survey: Survey): Promise<boolean> {
        return ext.context.globalState.get<boolean>(`${surveyRespondedKeyPrefix}.${survey.id}`, false) !== true &&
            await survey.isEligible() &&
            await ext.experimentationService.isFlightEnabled(`${surveyFlightPrefix}.${survey.id}`);
    }
}
