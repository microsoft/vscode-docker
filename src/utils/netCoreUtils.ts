/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseError } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { l10n } from 'vscode';
import { ext } from '../extensionVariables';
import { execAsync } from './execAsync';
import { getTempFileName } from './osUtils';

export async function getNetCoreProjectInfo(target: 'GetBlazorManifestLocations' | 'GetProjectProperties', project: string): Promise<string[]> {
    const targetsFile = path.join(ext.context.asAbsolutePath('resources'), 'netCore', `${target}.targets`);
    const outputFile = getTempFileName();

    const command = `dotnet build /r:false /t:${target} /p:CustomAfterMicrosoftCommonTargets="${targetsFile}" /p:CustomAfterMicrosoftCommonCrossTargetingTargets="${targetsFile}" /p:InfoOutputPath="${outputFile}" "${project}"`;

    try {
        try {
            await execAsync(command, { timeout: 20000 });
        } catch (err) {
            const error = parseError(err);
            throw new Error(l10n.t('Unable to determine project information for target \'{0}\' on project \'{1}\' {2}', target, project, error.message));
        }


        if (await fse.pathExists(outputFile)) {
            const contents = await fse.readFile(outputFile, 'utf-8');

            if (contents) {
                return contents.split(/\r?\n/ig);
            }
        }

        throw new Error(l10n.t('Unable to determine project information for target \'{0}\' on project \'{1}\'', target, project));
    } finally {
        if (await fse.pathExists(outputFile)) {
            await fse.unlink(outputFile);
        }
    }
}
