/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { cloneObject } from './cloneObject';

const oldSettingsMap = {
    'host': 'DOCKER_HOST',
    'context': 'DOCKER_CONTEXT',
    'certPath': 'DOCKER_CERT_PATH',
    'tlsVerify': 'DOCKER_TLS_VERIFY',
    'machineName': 'DOCKER_MACHINE_NAME',
};

export async function migrateOldEnvironmentSettingsIfNeeded(): Promise<void> {
    const oldConfig = vscode.workspace.getConfiguration('docker');
    const newConfig = oldConfig;

    let alreadyPrompted = false;
    for (const oldSetting of Object.keys(oldSettingsMap)) {
        const settingValue: string | undefined = oldConfig.get<string>(oldSetting);

        // If any config target has a value, we'll attempt to migrate all three config sections as needed
        if (settingValue) {
            // Prompt if we haven't already
            if (!alreadyPrompted) {
                const response = await vscode.window.showWarningMessage(
                    vscode.l10n.t('Some of your Docker extension settings have been renamed. Would you like us to migrate them for you?'),
                    DialogResponses.yes,
                    DialogResponses.no
                );

                if (response === DialogResponses.yes) {
                    alreadyPrompted = true;
                } else {
                    return;
                }
            }

            const newSetting = oldSettingsMap[oldSetting];
            await migrateOldEnvironmentSetting(oldConfig, oldSetting, newConfig, newSetting);
        }
    }
}

async function migrateOldEnvironmentSetting(
    oldConfig: vscode.WorkspaceConfiguration,
    oldSetting: string,
    newConfig: vscode.WorkspaceConfiguration,
    newSetting: string
): Promise<void> {
    const oldValueInspection = oldConfig.inspect<string>(oldSetting);
    const newValueInspection = newConfig.inspect<NodeJS.ProcessEnv>('environment');

    // Migrate the global AKA user setting
    await migrateOldEnvironmentSettingForTarget(
        oldConfig,
        oldSetting,
        oldValueInspection.globalValue,
        newConfig,
        newSetting,
        newValueInspection.globalValue,
        vscode.ConfigurationTarget.Global
    );

    // Migrate the workspace setting
    await migrateOldEnvironmentSettingForTarget(
        oldConfig,
        oldSetting,
        oldValueInspection.workspaceValue,
        newConfig,
        newSetting,
        newValueInspection.workspaceValue,
        vscode.ConfigurationTarget.Workspace
    );

    // Migrate the workspace folder setting
    await migrateOldEnvironmentSettingForTarget(
        oldConfig,
        oldSetting,
        oldValueInspection.workspaceFolderValue,
        newConfig,
        newSetting,
        newValueInspection.workspaceFolderValue,
        vscode.ConfigurationTarget.WorkspaceFolder
    );
}

async function migrateOldEnvironmentSettingForTarget(
    oldConfig: vscode.WorkspaceConfiguration,
    oldSetting: string,
    oldValue: string | undefined,
    newConfig: vscode.WorkspaceConfiguration,
    newSetting: string,
    newValue: NodeJS.ProcessEnv | undefined,
    target: vscode.ConfigurationTarget
): Promise<void> {
    // If no value was set in this particular target, skip
    if (!oldValue) {
        return;
    }

    // Remove the old setting from this target
    await oldConfig.update(oldSetting, undefined, target);

    // Append the old value to the current environment object for this target
    newValue = cloneObject(newValue ?? {});
    newValue[newSetting] = oldValue;

    // Update the new setting for this target
    await newConfig.update('environment', newValue, target);
}
