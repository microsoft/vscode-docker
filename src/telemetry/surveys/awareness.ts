/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { Survey } from './SurveyManager';

const minimumOverallSessions = 2;
const maximumNotEditOnlySessions = 0;

export const awareness: Survey = {
    id: 'aware',
    prompt: l10n.t('The Docker extension is always adding new features. Would you like to learn more about them?'),
    buttons: new Map<string, string | undefined>([
        [l10n.t('Watch a video'), 'https://aka.ms/AA8lh3s'],
        [l10n.t('Read docs'), 'https://aka.ms/AA9j59w'],
        [l10n.t('Don\'t show again'), undefined],
    ]),
    activationDelayMs: 30 * 1000,
    isEligible: isEligible,
};

async function isEligible(): Promise<boolean> {
    const overallActivity = ext.activityMeasurementService.getActivityMeasurement('overall');
    const noEditActivity = ext.activityMeasurementService.getActivityMeasurement('overallnoedit');

    return overallActivity.totalSessions >= minimumOverallSessions &&
        noEditActivity.totalSessions <= maximumNotEditOnlySessions;
}
