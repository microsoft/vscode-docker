/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';
import { AsyncLazy } from './lazy';
import { execAsync } from './spawnAsync';

export interface IDockerInstallStatusProvider {
    isDockerInstalled(): Promise<boolean>
}

class DockerInstallStatusProvider implements IDockerInstallStatusProvider {
    private maxCacheTime: number = 30000;
    private isDockerInstalledLazy: AsyncLazy<boolean>;

    public constructor() {
        this.isDockerInstalledLazy = new AsyncLazy<boolean>(async () => {
            const dockerInstalled = await this.isDockerInstalledRealTimeCheck();
            if (dockerInstalled) {
                // once docker is installed, lets assume that it will not be uninstalled.
                // It is unlikely user will uninstall the docker, in which case user has open a new workspace to get the updated status.
                this.isDockerInstalledLazy.cacheForever();
            }
            return dockerInstalled;
        }, this.maxCacheTime);
    }

    public async isDockerInstalled(): Promise<boolean> {
        return await this.isDockerInstalledLazy.getValue();
    }

    public async isDockerInstalledRealTimeCheck(): Promise<boolean> {
        try {

            await execAsync(`${ext.dockerContextManager.getDockerCommand()} -v`);
            return true; // As long as the docker command did't throw exception, assume it is installed.
        } catch (error) {
            return false; // docker not installed
        }
    }
}

export const dockerInstallStatusProvider = new DockerInstallStatusProvider();
