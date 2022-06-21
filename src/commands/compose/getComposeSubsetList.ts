/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { execAsync } from '../../utils/spawnAsync';

// Matches an `up` or `down` and everything after it--so that it can be replaced with `config --services`, to get a service list using all of the files originally part of the compose command
const composeCommandReplaceRegex = /(\b(up|down)\b).*$/i;

type SubsetType = 'services' | 'profiles';

export async function getComposeProfilesOrServices(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<{ services: string | undefined, profiles: string | undefined }> {
    const profiles = await getServiceSubsets(workspaceFolder, composeCommand, 'profiles');

    // If there any profiles, we need to ask the user whether they want profiles or services, since they are mutually exclusive to use
    // Otherwise, if there are no profiles, we'll automatically assume services
    let useProfiles = false;
    if (profiles?.length) {
        const profilesOrServices: IAzureQuickPickItem<SubsetType>[] = [
            {
                label: localize('vscode-docker.getComposeSubsetList.services', 'Services'),
                data: 'services'
            },
            {
                label: localize('vscode-docker.getComposeSubsetList.profiles', 'Profiles'),
                data: 'profiles'
            }
        ];

        useProfiles = 'profiles' === (await context.ui.showQuickPick(profilesOrServices, { placeHolder: localize('vscode-docker.getComposeSubsetList.servicesOrProfiles', 'Do you want to start services or profiles?') })).data;
    }

    return {
        profiles: useProfiles ? await getComposeProfileList(context, workspaceFolder, composeCommand, profiles) : '',
        services: !useProfiles ? await getComposeServiceList(context, workspaceFolder, composeCommand) : '',
    };
}

export async function getComposeProfileList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, prefetchedProfiles?: string[]): Promise<string> {
    const profiles = prefetchedProfiles ?? await getServiceSubsets(workspaceFolder, composeCommand, 'profiles');

    if (!profiles?.length) {
        // No profiles or isn't supported, nothing to do
        return '';
    }

    // Fetch the previously chosen profiles list. By default, all will be selected.
    const workspaceProfileListKey = `vscode-docker.composeProfiles.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceProfileListKey, profiles);
    const result = await pickSubsets(context, 'profiles', profiles, previousChoices);

    // Update the cache
    await ext.context.workspaceState.update(workspaceProfileListKey, result);

    return result.map(p => `--profile ${p}`).join(' ');
}

export async function getComposeServiceList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<string> {
    const services = await getServiceSubsets(workspaceFolder, composeCommand, 'services');

    if (!services?.length) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(localize('vscode-docker.getComposeSubsetList.noServices', 'No services were found in the compose document(s). Did you mean to use profiles instead?'));
    }

    // Fetch the previously chosen services list. By default, all will be selected.
    const workspaceServiceListKey = `vscode-docker.composeServices.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceServiceListKey, services);
    const result = await pickSubsets(context, 'services', services, previousChoices);

    // Update the cache
    await ext.context.workspaceState.update(workspaceServiceListKey, result);

    return result.join(' ');
}

async function pickSubsets(context: IActionContext, type: SubsetType, allChoices: string[], previousChoices: string[]): Promise<string[]> {
    const label = type === 'profiles' ?
        localize('vscode-docker.getComposeSubsetList.chooseProfiles', 'Choose profiles to start') :
        localize('vscode-docker.getComposeSubsetList.choose', 'Choose services to start');

    const pickChoices: IAzureQuickPickItem<string>[] = allChoices.map(s => ({
        label: s,
        data: s,
        picked: previousChoices.some(p => p === s),
    }));

    const chosenSubsets = await context.ui.showQuickPick(
        pickChoices,
        {
            canPickMany: true,
            placeHolder: label,
        }
    );

    context.telemetry.measurements.totalServices = pickChoices.length;
    context.telemetry.measurements.chosenServices = chosenSubsets.length;
    context.telemetry.properties.subsetType = type;

    return chosenSubsets.map(c => c.data);
}

async function getServiceSubsets(workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, type: SubsetType): Promise<string[] | undefined> {
    // TODO: if there are any profiles, then only services with no profiles show up when you query `config --services`. This makes for a lousy UX.
    // Bug for that is https://github.com/docker/compose-cli/issues/1964

    try {
        // Start by getting a new command with the exact same files list (replaces the "up ..." or "down ..." with "config --services" or "config --profiles")
        const configCommand = composeCommand.replace(composeCommandReplaceRegex, `config --${type}`);

        const { stdout } = await execAsync(configCommand, { cwd: workspaceFolder.uri.fsPath });

        // The output of the config command is a list of services / profiles, one per line
        // Split them up and remove empty entries
        return stdout.split(/\r?\n/im).filter(l => { return l; });
    } catch (err) {
        // Profiles is not yet widely supported, so those errors will be eaten--otherwise, rethrow
        if (type === 'profiles') {
            return undefined;
        } else {
            throw err;
        }
    }
}
