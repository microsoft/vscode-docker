/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env, Memento, MessageItem, Uri, window } from "vscode";
import { ext } from "vscode-azureappservice/out/src/extensionVariables";

const PROBABILITY = 0.15;
const MIN_SESSION_COUNT = 10;

const SURVEY_NAME = 'nps1';
const SURVEY_URL = 'https://www.surveymonkey.com/r/vscodedockernpsinproduct';

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

        const sessionCount = globalState.get(SESSION_COUNT_KEY, 0) + 1;
        const sessionDate = new Date().toDateString();

        // If this session is on same date as last session, don't count it
        if (sessionDate === globalState.get(LAST_SESSION_DATE_KEY, new Date(0).toDateString())) {
            return;
        }

        // Count this session
        await globalState.update(SESSION_COUNT_KEY, sessionCount);
        await globalState.update(LAST_SESSION_DATE_KEY, sessionDate);

        // If under the MIN_SESSION_COUNT, don't ask
        if (sessionCount < MIN_SESSION_COUNT) {
            return;
        }

        // Decide if they are a candidate (if we previously decided they are and they did Remind Me Later, we will not do probability again)
        // tslint:disable-next-line: insecure-random
        isCandidate = isCandidate || Math.random() < PROBABILITY;
        await globalState.update(IS_CANDIDATE_KEY, isCandidate);

        // If not a candidate, don't ask
        if (!isCandidate) {
            return;
        }

        const take: MessageItem = { title: 'Take Survey' };
        const remind: MessageItem = { title: 'Remind Me Later' };
        const never: MessageItem = { title: 'Don\'t Show Again' };

        const result = await window.showInformationMessage('Do you mind taking a quick feedback survey about the Docker Extension for VS Code?', take, remind, never);

        if (!result || result === remind) {
            // If they hit the X or Remind Me Later, ask again in 3 sessions
            ext.reporter.sendTelemetryEvent('nps', { survey: SURVEY_NAME, response: 'remind' });
            await globalState.update(SESSION_COUNT_KEY, sessionCount - 3);
        } else if (result === never) {
            // If they hit Never, don't ask again (for this survey name)
            ext.reporter.sendTelemetryEvent('nps', { survey: SURVEY_NAME, response: 'never' });
            await globalState.update(IS_CANDIDATE_KEY, false);
        } else if (result === take) {
            // If they hit Take, don't ask again (for this survey name), and open the survey
            ext.reporter.sendTelemetryEvent('nps', { survey: SURVEY_NAME, response: 'take' });
            await globalState.update(IS_CANDIDATE_KEY, false);
            await env.openExternal(Uri.parse(`${SURVEY_URL}?o=${encodeURIComponent(process.platform)}&m=${encodeURIComponent(env.machineId)}`));
        }
    } catch { } // Best effort
}
