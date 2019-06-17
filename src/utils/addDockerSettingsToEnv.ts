
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace } from 'vscode';
import { configPrefix } from '../constants';
import { ext } from '../extensionVariables';

export function addDockerSettingsToEnv(env: {}, oldEnv: {}): void {
    addDockerSettingToEnv("host", 'DOCKER_HOST', env, oldEnv);
    addDockerSettingToEnv("certPath", 'DOCKER_CERT_PATH', env, oldEnv);
    addDockerSettingToEnv("tlsVerify", 'DOCKER_TLS_VERIFY', env, oldEnv);
    addDockerSettingToEnv("machineName", 'DOCKER_MACHINE_NAME', env, oldEnv);
}

function addDockerSettingToEnv(settingKey: string, envVar: string, env: {}, oldEnv: {}): void {
    const value = workspace.getConfiguration(configPrefix).get<string>(settingKey, '');

    const expectedType = "string";
    const actualType = typeof value;
    if (expectedType !== actualType) {
        ext.outputChannel.appendLine(`WARNING: Ignoring setting "${configPrefix}.${settingKey}" because type "${actualType}" does not match expected type "${expectedType}".`);
    } else if (value) {
        if (oldEnv[envVar] && oldEnv[envVar] !== value) {
            ext.outputChannel.appendLine(`WARNING: Overwriting environment variable "${envVar}" with VS Code setting "${configPrefix}.${settingKey}".`);
        }

        env[envVar] = value;
    }
}
