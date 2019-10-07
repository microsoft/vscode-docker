/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, workspace, WorkspaceConfiguration } from "vscode";
import { configPrefix } from "../extension.bundle";
import { Configuration } from "../src/extension";

export async function runWithSetting<T>(key: string, value: T | undefined, callback: () => Promise<void>): Promise<void> {

    // Stop the configuration listener as it refreshes Dockerode too much
    // validateTree tends to call this method four times per test, which meant four calls to refreshDockerode() per test
    // With refreshDockerode() being async, ext.dockerode would get overwritten at a somewhat random time *during* the test, causing failures
    Configuration.dispose();

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
