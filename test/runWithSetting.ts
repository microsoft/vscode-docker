/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, workspace, WorkspaceConfiguration } from "vscode";
import { configPrefix } from "../extension.bundle";

export async function runWithSetting<T>(key: string, value: T | undefined, callback: () => Promise<void>): Promise<void> {
    const config: WorkspaceConfiguration = workspace.getConfiguration(configPrefix);
    const result = config.inspect<T>(key);
    const oldValue: T | undefined = result && result.globalValue;
    try {
        await config.update(key, value, ConfigurationTarget.Global);
        await callback();
    } finally {
        await config.update(key, oldValue, ConfigurationTarget.Global);
    }
}
