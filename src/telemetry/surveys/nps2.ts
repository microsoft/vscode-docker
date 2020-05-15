/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { localize } from '../../localize';
import { Survey } from './SurveyManager';

export const nps2: Survey = {
    id: 'nps2',
    url: 'https://aka.ms/vscodedockernpsinproduct',
    prompt: localize('vscode-docker.survey.nps.prompt', 'Would you be willing to take a quick feedback survey about the Docker Extension for VS Code?'),
    activationDelayMs: 60 * 1000,
    isEligible: isNPSEligible,
}

async function isNPSEligible(): Promise<boolean> {
    return vscode.env.language === 'en' || vscode.env.language.startsWith('en-');
}
