/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { URL } from 'url';
import { GatherInformationStep } from '../GatherInformationStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

interface DotNetProfile {
    commandName?: string;
    applicationUrl?: string;
}

interface DotNetLaunchSettings {
    profiles?: { [key: string]: DotNetProfile };
}

export class NetCoreTryGetRandomPortStep extends GatherInformationStep<NetCoreScaffoldingWizardContext> {
    public async prompt(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        try {
            wizardContext.suggestedRandomPorts = await this.tryGetPortFromLaunchSettings(wizardContext.workspaceFolder);
        } catch {
            // Best effort
            wizardContext.suggestedRandomPorts = undefined;
        }
    }

    public shouldPrompt(wizardContext: NetCoreScaffoldingWizardContext): boolean {
        return !(wizardContext.suggestedRandomPorts?.length) && !!wizardContext.workspaceFolder && !!wizardContext.artifact;
    }

    /**
     * Tries getting the random port assigned by .NET scaffolding. Adapted from https://github.com/microsoft/vscode-dapr/blob/36a4b9e5bb47784a306009cf5def5fe674b204a8/src/commands/scaffoldDaprTasks.ts#L48-L81
     * @param workspaceFolder The workspace folder to search for launch settings files within
     * @returns An array with a random port assigned by .NET scaffolding, or undefined
     */
    private async tryGetPortFromLaunchSettings(workspaceFolder: vscode.WorkspaceFolder): Promise<number[] | undefined> {
        const launchSettingsFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, "**/Properties/launchSettings.json"));

        for (const launchSettingsFile of launchSettingsFiles) {
            const launchSettingsJson = await fse.readJSON(launchSettingsFile.fsPath) as DotNetLaunchSettings;

            if (launchSettingsJson.profiles) {
                const projectProfile = Object.values(launchSettingsJson.profiles).find(profile => profile.commandName === 'Project');

                if (projectProfile?.applicationUrl) {
                    const applicationUrls = projectProfile.applicationUrl.split(';');

                    for (const applicationUrl of applicationUrls) {
                        try {
                            const url = new URL(applicationUrl);

                            if (url.protocol === 'http:' && url.port) {
                                return [parseInt(url.port, 10)];
                            }
                        }
                        catch {
                            // NOTE: Ignore any errors parsing the URL.
                        }
                    }
                }
            }
        }

        return undefined;
    }
}
