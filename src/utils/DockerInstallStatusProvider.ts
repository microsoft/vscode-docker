/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AsyncLazy } from "./lazy";
import { execAsync } from "./spawnAsync";

export interface IDockerInstallStatusProvider {
    isDockerInstalled(): Promise<boolean>
}

class DockerInstallStatusProvider implements IDockerInstallStatusProvider {
    private maxCacheTime: number = 5000;
    private isDockerInstalledLazy: AsyncLazy<boolean>;

    public constructor() {
        this.isDockerInstalledLazy = new AsyncLazy<boolean>(async () => {
            try {
                await execAsync('docker -v');
                return true; // As long as the docker command did't throw exception, assume it is installed.
            } catch (error) {
                return false; // docker not installed
            }
        }, this.maxCacheTime);
    }

    public async isDockerInstalled(): Promise<boolean> {
        return await this.isDockerInstalledLazy.getValue();
    }
}

export const dockerInstallStatusProvider = new DockerInstallStatusProvider();
