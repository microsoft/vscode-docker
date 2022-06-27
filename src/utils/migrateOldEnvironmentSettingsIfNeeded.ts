/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { localize } from '../localize';
import { cloneObject } from './cloneObject';

const oldSettingsMap = {
    'host': 'DOCKER_HOST',
    'context': 'DOCKER_CONTEXT',
    'certPath': 'DOCKER_CERT_PATH',
    'tlsVerify': 'DOCKER_TLS_VERIFY',
    'machineName': 'DOCKER_MACHINE_NAME',
};

export async function migrateOldEnvironmentSettingsIfNeeded(): Promise<void> {
    const config = vscode.workspace.getConfiguration('docker');

    let alreadyPrompted = false;
    for (const oldSetting of Object.keys(oldSettingsMap)) {
        const settingValue: string | undefined = config.get<string>(oldSetting);

        // If any config target has a value, we'll attempt to migrate all three as necessary
        if (settingValue) {
            // Prompt if we haven't already
            if (!alreadyPrompted) {
                const response = await vscode.window.showWarningMessage(
                    localize('vscode-docker.checkForOldEnvironmentSettings.prompt', 'Some of your Docker extension settings have been renamed. Would you like us to migrate them for you?'),
                    DialogResponses.yes,
                    DialogResponses.no
                );

                if (response === DialogResponses.yes) {
                    alreadyPrompted = true;
                } else {
                    return;
                }
            }

            await migrateOldEnvironmentSetting(config, oldSetting);
        }
    }
}

async function migrateOldEnvironmentSetting(config: vscode.WorkspaceConfiguration, oldSetting: string): Promise<void> {
    const settingInspection = config.inspect<string>(oldSetting);
    const currentEnvironmentSettings = config.inspect<NodeJS.ProcessEnv>('environment');

    // Migrate the global AKA user setting
    await migrateOldEnvironmentSettingForTarget(
        config,
        oldSetting,
        settingInspection.globalValue,
        currentEnvironmentSettings.globalValue,
        vscode.ConfigurationTarget.Global
    );

    // Migrate the workspace setting
    await migrateOldEnvironmentSettingForTarget(
        config,
        oldSetting,
        settingInspection.workspaceValue,
        currentEnvironmentSettings.workspaceValue,
        vscode.ConfigurationTarget.Workspace
    );

    // Migrate the workspace folder setting
    await migrateOldEnvironmentSettingForTarget(
        config,
        oldSetting,
        settingInspection.workspaceFolderValue,
        currentEnvironmentSettings.workspaceFolderValue,
        vscode.ConfigurationTarget.WorkspaceFolder
    );
}

async function migrateOldEnvironmentSettingForTarget(
    config: vscode.WorkspaceConfiguration,
    oldSetting: string,
    oldValueForTarget: string | undefined,
    currentEnvValue: NodeJS.ProcessEnv | undefined,
    target: vscode.ConfigurationTarget
): Promise<void> {
    // If no value was set in this particular target, skip
    if (!oldValueForTarget) {
        return;
    }

    // Remove the old setting from this target
    await config.update(oldSetting, undefined, target);

    // Append the old value to the current environment object for this target
    const newValue = cloneObject(currentEnvValue ?? {});
    newValue[oldSettingsMap[oldSetting]] = oldValueForTarget;

    // Update the new setting for this target
    await config.update('environment', newValue, target);
}
