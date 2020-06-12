/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { configPrefix } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export function addDockerSettingsToEnv(env: NodeJS.ProcessEnv, oldEnv: NodeJS.ProcessEnv): void {
    addDockerSettingToEnv("host", 'DOCKER_HOST', env, oldEnv);
    addDockerSettingToEnv("certPath", 'DOCKER_CERT_PATH', env, oldEnv);
    addDockerSettingToEnv("tlsVerify", 'DOCKER_TLS_VERIFY', env, oldEnv);
    addDockerSettingToEnv("machineName", 'DOCKER_MACHINE_NAME', env, oldEnv);
}

function addDockerSettingToEnv(settingKey: string, envVar: string, env: NodeJS.ProcessEnv, oldEnv: NodeJS.ProcessEnv): void {
    const value = workspace.getConfiguration(configPrefix).get<string>(settingKey, '');

    const expectedType = "string";
    const actualType = typeof value;
    if (expectedType !== actualType) {
        ext.outputChannel.appendLine(localize('vscode-docker.utils.env.ignoring', 'WARNING: Ignoring setting "{0}.{1}" because type "{2}" does not match expected type "{3}".', configPrefix, settingKey, actualType, expectedType));
    } else if (value) {
        if (oldEnv[envVar] && oldEnv[envVar] !== value) {
            ext.outputChannel.appendLine(localize('vscode-docker.utils.env.overwriting', 'WARNING: Overwriting environment variable "{0}" with VS Code setting "{1}.{2}".', envVar, configPrefix, settingKey));
        }

        env[envVar] = value;
    }
}
