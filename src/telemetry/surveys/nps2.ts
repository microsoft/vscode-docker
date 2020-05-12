/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ActivityType } from '../ActivityMeasurementService';
import { Survey } from './SurveyManager';

const sessionThreshold = 10;
const sessionType: ActivityType = 'overall';

const nps2: Survey = {
    id: 'nps2',
    url: 'https://microsoft.com', // TODO
    prompt: localize('vscode-docker.survey.nps.prompt', 'Do you mind taking a quick feedback survey about the Docker Extension for VS Code?'),
    activationDelay: 60 * 1000,
    isEligible: isNPSEligible
}

async function isNPSEligible(): Promise<boolean> {
    return (vscode.env.language === 'en' || vscode.env.language.startsWith('en-')) &&
        ext.activityMeasurementService.getActivityMeasurement(sessionType).totalSessions >= sessionThreshold;
}

export default nps2;
