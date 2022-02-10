/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../localize';
import { Survey } from './SurveyManager';

export const survey3: Survey = {
    id: 'survey3',
    prompt: localize('vscode-docker.survey.survey3.prompt', 'The Docker extension is always adding new features. Would you like to learn more about them?'),
    buttons: new Map<string, string | undefined>([
        [localize('vscode-docker.survey.survey3.button.take', 'Take survey'), 'https://aka.ms/dockerextensionsurvey'],
        [localize('vscode-docker.survey.survey3.button.never', 'Don\'t ask again'), undefined],
    ]),
    activationDelayMs: 30 * 1000,
    isEligible: isEligible,
};

async function isEligible(): Promise<boolean> {
    return true;
}
