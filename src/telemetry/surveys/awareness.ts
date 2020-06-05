/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { Survey } from './SurveyManager';

const minimumOverallSessions = 3;
const maximumNotEditOnlySessions = 0;

export const awareness: Survey = {
    id: 'aware',
    url: 'https://aka.ms/AA8lh3s',
    prompt: localize('vscode-docker.survey.aware.prompt', 'The Docker extension is always adding new features. Do you want to learn more about them?'),
    buttons: [localize('vscode-docker.survey.aware.button.learnMore', 'Learn more'), localize('vscode-docker.survey.aware.button.never', 'Don\'t show again')],
    activationDelayMs: 30 * 1000,
    isEligible: isEligible,
}

async function isEligible(): Promise<boolean> {
    const overallActivity = ext.activityMeasurementService.getActivityMeasurement('overall');
    const noEditActivity = ext.activityMeasurementService.getActivityMeasurement('overallnoedit');

    return (vscode.env.language === 'en' || vscode.env.language.startsWith('en-')) &&
        overallActivity.totalSessions >= minimumOverallSessions &&
        noEditActivity.totalSessions <= maximumNotEditOnlySessions;
}
