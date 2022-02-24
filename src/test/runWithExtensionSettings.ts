/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, WorkspaceConfiguration, workspace } from "vscode";
import { configPrefix } from "../constants";

export async function runWithExtensionSettings<TCallback>(newValues: { [key: string]: unknown }, callback: () => Promise<TCallback>): Promise<TCallback> {
    const config: WorkspaceConfiguration = workspace.getConfiguration(configPrefix);

    const oldValues: { [key: string]: unknown } = {};

    try {
        for (const key of Object.keys(newValues)) {
            oldValues[key] = config.inspect(key)?.globalValue;
            await config.update(key, newValues[key], ConfigurationTarget.Global);
        }

        return await callback();
    } finally {
        for (const key of Object.keys(oldValues)) {
            await config.update(key, oldValues[key], ConfigurationTarget.Global);
        }
    }
}
