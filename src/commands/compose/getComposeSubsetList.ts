/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { execAsync } from '../../utils/execAsync';

// Matches an `up` or `down` and everything after it--so that it can be replaced with `config --services`, to get a service list using all of the files originally part of the compose command
const composeCommandReplaceRegex = /(\b(up|down)\b).*$/i;

type SubsetType = 'services' | 'profiles';

export async function getComposeProfilesOrServices(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, preselectedServices?: string[], preselectedProfiles?: string[]): Promise<{ services: string | undefined, profiles: string | undefined }> {
    const profiles = await getServiceSubsets(workspaceFolder, composeCommand, 'profiles');

    if (preselectedServices?.length && preselectedProfiles?.length) {
        throw new Error(vscode.l10n.t('Cannot specify both services and profiles to start. Please choose one or the other.'));
    }

    // If there any profiles, we need to ask the user whether they want profiles or services, since they are mutually exclusive to use
    // Otherwise, if there are no profiles, we'll automatically assume services
    let useProfiles = false;
    if (preselectedProfiles?.length) {
        useProfiles = true;
    } else if (preselectedServices?.length) {
        useProfiles = false;
    } else if (profiles?.length) {
        const profilesOrServices: IAzureQuickPickItem<SubsetType>[] = [
            {
                label: vscode.l10n.t('Services'),
                data: 'services'
            },
            {
                label: vscode.l10n.t('Profiles'),
                data: 'profiles'
            }
        ];

        useProfiles = 'profiles' === (await context.ui.showQuickPick(profilesOrServices, { placeHolder: vscode.l10n.t('Do you want to start services or profiles?') })).data;
    }

    return {
        profiles: useProfiles ? await getComposeProfileList(context, workspaceFolder, composeCommand, profiles, preselectedProfiles) : '',
        services: !useProfiles ? await getComposeServiceList(context, workspaceFolder, composeCommand, preselectedServices) : '',
    };
}

export async function getComposeProfileList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, prefetchedProfiles?: string[], preselectedProfiles?: string[]): Promise<string> {
    const profiles = prefetchedProfiles ?? await getServiceSubsets(workspaceFolder, composeCommand, 'profiles');

    if (!profiles?.length) {
        // No profiles or isn't supported, nothing to do
        return '';
    }

    // Fetch the previously chosen profiles list. By default, all will be selected.
    const workspaceProfileListKey = `vscode-docker.composeProfiles.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceProfileListKey, profiles);
    const result = preselectedProfiles?.length ? preselectedProfiles : await pickSubsets(context, 'profiles', profiles, previousChoices);

    // Update the cache
    await ext.context.workspaceState.update(workspaceProfileListKey, result);

    return result.map(p => `--profile ${p}`).join(' ');
}

export async function getComposeServiceList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, preselectedServices?: string[]): Promise<string> {
    const services = await getServiceSubsets(workspaceFolder, composeCommand, 'services');

    if (!services?.length) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(vscode.l10n.t('No services were found in the compose document(s). Did you mean to use profiles instead?'));
    }

    // Fetch the previously chosen services list. By default, all will be selected.
    const workspaceServiceListKey = `vscode-docker.composeServices.${workspaceFolder.name}`;
    const previousChoices = ext.context.workspaceState.get<string[]>(workspaceServiceListKey, services);
    const result = preselectedServices?.length ? preselectedServices : await pickSubsets(context, 'services', services, previousChoices);

    // Update the cache
    await ext.context.workspaceState.update(workspaceServiceListKey, result);

    return result.join(' ');
}

async function pickSubsets(context: IActionContext, type: SubsetType, allChoices: string[], previousChoices: string[]): Promise<string[]> {
    const label = type === 'profiles' ?
        vscode.l10n.t('Choose profiles to start') :
        vscode.l10n.t('Choose services to start');

    const pickChoices: IAzureQuickPickItem<string>[] = allChoices.map(s => ({
        label: s,
        data: s,
    }));

    const chosenSubsets = await context.ui.showQuickPick(
        pickChoices,
        {
            canPickMany: true,
            placeHolder: label,
            isPickSelected: (pick) => previousChoices.some(previous => (pick as IAzureQuickPickItem<string>).data === previous),
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
