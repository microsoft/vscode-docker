/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { execAsync } from '../../utils/spawnAsync';

// Matches an `up` or `down` and everything after it--so that it can be replaced with `config --services`, to get a service list using all of the files originally part of the compose command
const composeCommandReplaceRegex = /(\b(up|down)\b).*$/i;

type SubsetType = 'services' | 'profiles';

export async function getComposeServiceList(context: IActionContext, workspaceFolder: vscode.WorkspaceFolder, composeCommand: string): Promise<string> {
    const services = await getServiceSubsets(workspaceFolder, composeCommand, 'services');
    const profiles = await getServiceSubsets(workspaceFolder, composeCommand, 'profiles');

    let useProfiles = false;
    // If there any profiles, we need to ask the user whether they want profiles or services, since they are mutually exclusive to use
    if (profiles?.length) {
        const profilesOrServices: IAzureQuickPickItem<SubsetType>[] = [
            {
                label: localize('vscode-docker.getComposeServiceList.services', 'Services'),
                data: 'services'
            },
            {
                label: localize('vscode-docker.getComposeServiceList.profiles', 'Profiles'),
                data: 'profiles'
            }
        ];

        useProfiles = 'profiles' === (await ext.ui.showQuickPick(profilesOrServices, { placeHolder: localize('vscode-docker.getComposeServiceList.servicesOrProfiles', 'Do you want to start services or profiles?') })).data;
    }

    // Fetch the previously chosen services list. By default, all will be selected.
    const workspaceServiceListKey = `vscode-docker.composeServices.${workspaceFolder.name}`;
    const workspaceProfileListKey = `vscode-docker.composeProfiles.${workspaceFolder.name}`;
    const previousServiceChoices = ext.context.workspaceState.get<string[]>(workspaceServiceListKey, services);
    const previousProfileChoices = ext.context.workspaceState.get<string[] | undefined>(workspaceProfileListKey, profiles);

    const pickChoices: IAzureQuickPickItem<string>[] = services.map(s => ({
        label: s,
        data: s,
        picked: previousServiceChoices.some(p => p === s),
    }));

    const subsetChoices =
        await context.ui.showQuickPick(
            pickChoices,
            {
                canPickMany: true,
                placeHolder: localize('vscode-docker.getComposeServiceList.choose', 'Choose services to start'),
            }
        );

    context.telemetry.measurements.totalServices = pickChoices.length;
    context.telemetry.measurements.chosenServices = subsetChoices.length;
    context.telemetry.properties.subsetType = useProfiles ? 'profiles' : 'services';

    // Update the cache
    await ext.context.workspaceState.update(workspaceServiceListKey, subsetChoices.map(c => c.data));

    return subsetChoices.map(c => c.data).join(' ');
}

async function getServiceSubsets(workspaceFolder: vscode.WorkspaceFolder, composeCommand: string, type: SubsetType): Promise<string[] | undefined> {
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
