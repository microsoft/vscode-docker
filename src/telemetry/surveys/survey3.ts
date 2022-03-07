/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { Survey } from './SurveyManager';

const minimumOverallSessions = 10;

export const survey3: Survey = {
    id: 'survey3',
    prompt: localize('vscode-docker.surveys.survey3.prompt', 'How can we make the Docker extension better?'),
    buttons: new Map<string, string | undefined>([
        [localize('vscode-docker.surveys.survey3.button.take', 'Take survey'), 'https://aka.ms/dockerextensionsurvey'],
        [localize('vscode-docker.surveys.survey3.button.never', 'Don\'t ask again'), undefined],
    ]),
    activationDelayMs: 60 * 1000,
    isEligible: isEligible,
};

async function isEligible(): Promise<boolean> {
    const overallActivity = ext.activityMeasurementService.getActivityMeasurement('overall');
    return overallActivity.totalSessions >= minimumOverallSessions;
}
