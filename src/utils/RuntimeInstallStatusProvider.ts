/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';
import { AsyncLazy } from './lazy';

class RuntimeInstallStatusProvider {
    private maxCacheTime: number = 30000;
    private isRuntimeInstalledLazy: AsyncLazy<boolean>;

    public constructor() {
        this.isRuntimeInstalledLazy = new AsyncLazy<boolean>(async () => {
            const runtimeInstalled = await this.isRuntimeInstalledRealTimeCheck();
            if (runtimeInstalled) {
                // once runtime is installed, lets assume that it will not be uninstalled.
                // It is unlikely user will uninstall the runtime, in which case user has open a new workspace to get the updated status.
                this.isRuntimeInstalledLazy.cacheForever();
            }
            return runtimeInstalled;
        }, this.maxCacheTime);
    }

    public async isRuntimeInstalled(): Promise<boolean> {
        return await this.isRuntimeInstalledLazy.getValue();
    }

    public async isRuntimeInstalledRealTimeCheck(): Promise<boolean> {
        try {
            await ext.runWithDefaults(client =>
                client.checkInstall({})
            );
            return true; // As long as the -v command did't throw exception, assume it is installed.
        } catch (error) {
            return false; // runtime not installed
        }
    }
}

export const runtimeInstallStatusProvider = new RuntimeInstallStatusProvider();
