/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Loosely adapted from https://github.com/microsoft/vscode-azure-account/blob/2f497562cab5f3db09f983ab5101040f27dceb70/src/nps.ts

import { env, Memento, Uri, window } from "vscode";
import { ext } from "../extensionVariables";
import { localize } from '../localize';

const PROBABILITY = 0.15;
const MIN_SESSION_COUNT = 10;

const SURVEY_NAME = 'nps1';
const SURVEY_URL = 'https://aka.ms/vscodedockernpsinproduct';

const SESSION_COUNT_KEY = `${SURVEY_NAME}/sessioncount`;
const LAST_SESSION_DATE_KEY = `${SURVEY_NAME}/lastsessiondate`;
const IS_CANDIDATE_KEY = `${SURVEY_NAME}/iscandidate`;

export async function nps(globalState: Memento): Promise<void> {
    try {
        // If not English-language, don't ask
        if (env.language !== 'en' && !env.language.startsWith('en-')) {
            return;
        }

        let isCandidate: boolean | undefined = globalState.get(IS_CANDIDATE_KEY);

        // If not a candidate, don't ask
        if (isCandidate === false) {
            return;
        }

        const date = new Date().toDateString();
        const lastSessionDate = globalState.get(LAST_SESSION_DATE_KEY, new Date(0).toDateString());

        // If this session is on same date as last session, don't count it
        if (date === lastSessionDate) {
            return;
        }

        // Count this session
        const sessionCount = globalState.get(SESSION_COUNT_KEY, 0) + 1;
        await globalState.update(LAST_SESSION_DATE_KEY, date);
        await globalState.update(SESSION_COUNT_KEY, sessionCount);

        // If under the MIN_SESSION_COUNT, don't ask
        if (sessionCount < MIN_SESSION_COUNT) {
            return;
        }

        // Decide if they are a candidate (if we previously decided they are and they did Remind Me Later, we will not do probability again)
        // i.e. Probability only comes into play if isCandidate is undefined
        // tslint:disable-next-line: insecure-random
        isCandidate = isCandidate || Math.random() < PROBABILITY;
        await globalState.update(IS_CANDIDATE_KEY, isCandidate);

        // If not a candidate, don't ask
        if (!isCandidate) {
            return;
        }

        const take = { title: localize('vscode-docker.survey.take', 'Take Survey'), telName: 'take' };
        const remind = { title: localize('vscode-docker.survey.remind', 'Remind Me Later'), telName: 'remind' };
        const never = { title: localize('vscode-docker.survey.dontShow', 'Don\'t Show Again'), telName: 'never' };

        // Prompt, treating hitting X as Remind Me Later
        const result = (await window.showInformationMessage(localize('vscode-docker.survey.prompt1', 'Do you mind taking a quick feedback survey about the Docker Extension for VS Code?'), take, remind, never)) || remind;

        ext.reporter.sendTelemetryEvent('nps', { survey: SURVEY_NAME, response: result.telName });

        if (result === take) {
            // If they hit Take, don't ask again (for this survey name), and open the survey
            await globalState.update(IS_CANDIDATE_KEY, false);
            await env.openExternal(Uri.parse(`${SURVEY_URL}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(env.machineId)}`));
        } else if (result === remind) {
            // If they hit the X or Remind Me Later, ask again in 3 sessions
            await globalState.update(SESSION_COUNT_KEY, MIN_SESSION_COUNT - 3);
        } else if (result === never) {
            // If they hit Never, don't ask again (for this survey name)
            await globalState.update(IS_CANDIDATE_KEY, false);
        }
    } catch { } // Best effort
}
