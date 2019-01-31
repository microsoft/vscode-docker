/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { PlatformOS } from '../../utils/platform';
import { VsDbgClient } from './vsdbgClient';
import { DockerClient } from './dockerClient';

export interface DebuggerClient {
    getDebugger(os: PlatformOS, containerId: string): Promise<string>;
    getDebuggerFolder(): Promise<string>;
}

export class DefaultDebuggerClient {
    private static debuggerVersion: string = 'vs2017u5';
    private static debuggerLinuxAlpineRuntime: string = 'linux-musl-x64';
    private static debuggerLinuxDefaultRuntime: string = 'linux-x64';
    private static debuggerWindowsRuntime: string = 'win7-x64';

    constructor(
        private readonly dockerClient: DockerClient,
        private readonly vsdbgClient: VsDbgClient) {
    }

    public async getDebugger(os: PlatformOS, containerId: string): Promise<string> {
        if (os === 'Windows') {
            return await this.vsdbgClient.getVsDbgVersion(DefaultDebuggerClient.debuggerVersion, DefaultDebuggerClient.debuggerWindowsRuntime);
        } else {
            const result = await this.dockerClient.exec(containerId, '/bin/sh -c \'ID=default; if [ -e /etc/os-release ]; then . /etc/os-release; fi; echo $ID\'', { interactive: true });

            return await this.vsdbgClient.getVsDbgVersion(
                DefaultDebuggerClient.debuggerVersion,
                result.trim() === 'alpine'
                    ? DefaultDebuggerClient.debuggerLinuxAlpineRuntime
                    : DefaultDebuggerClient.debuggerLinuxDefaultRuntime);
        }
    }

    public getDebuggerFolder(): Promise<string> {
        return this.vsdbgClient.getVsDbgFolder();
    }
}
