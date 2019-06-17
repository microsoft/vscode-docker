
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { configPrefix } from '../constants';
import { ext } from '../extensionVariables';

export function addDockerSettingsToEnv(env: {}): void {
    addDockerSettingToEnv("host", 'DOCKER_HOST', env);
    addDockerSettingToEnv("certPath", 'DOCKER_CERT_PATH', env);
    addDockerSettingToEnv("tlsVerify", 'DOCKER_TLS_VERIFY', env);
    addDockerSettingToEnv("machineName", 'DOCKER_MACHINE_NAME', env);
}

function addDockerSettingToEnv(settingKey: string, envVar: string, env: {}): void {
    const value = workspace.getConfiguration(configPrefix).get<string>(settingKey, '');

    const expectedType = "string";
    const actualType = typeof value;
    if (expectedType !== actualType) {
        ext.outputChannel.appendLine(`WARNING: Ignoring setting "${configPrefix}.${settingKey}" because type "${actualType}" does not match expected type "${expectedType}".`);
    } else if (value) {
        env[envVar] = value;
    }
}
