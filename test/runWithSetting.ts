/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, workspace, WorkspaceConfiguration } from "vscode";
import { configPrefix } from "../extension.bundle";

export async function runWithSetting<TSetting, TCallback>(key: string, value: TSetting | undefined, callback: () => Promise<TCallback>): Promise<TCallback> {
    const config: WorkspaceConfiguration = workspace.getConfiguration(configPrefix);
    const result = config.inspect<TSetting>(key);
    const oldValue: TSetting | undefined = result && result.globalValue;
    try {
        await config.update(key, value, ConfigurationTarget.Global);
        return await callback();
    } finally {
        await config.update(key, oldValue, ConfigurationTarget.Global);
    }
}
