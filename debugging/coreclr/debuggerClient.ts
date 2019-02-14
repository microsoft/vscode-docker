/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { PlatformOS } from '../../utils/platform';
import { DockerClient } from './dockerClient';
import { VsDbgClient } from './vsdbgClient';

export interface DebuggerClient {
    getDebugger(os: PlatformOS, containerId: string): Promise<string>;
    getDebuggerFolder(): Promise<string>;
}

export class DefaultDebuggerClient {
    private static debuggerVersion: string = 'vs2017u5';
    private static debuggerLinuxAlpineRuntime: string = 'linux-musl-x64';
    private static debuggerLinuxDefaultRuntime: string = 'linux-x64';
    private static debuggerWindowsRuntime: string = 'win7-x64';

    // This script determines the "type" of Linux release (e.g. 'alpine', 'debian', etc.).
    // NOTE: The result may contain line endings.
    private static debuggerLinuxReleaseIdScript: string = '/bin/sh -c \'ID=default; if [ -e /etc/os-release ]; then . /etc/os-release; fi; echo $ID\'';

    constructor(
        private readonly dockerClient: DockerClient,
        private readonly vsdbgClient: VsDbgClient) {
    }

    public async getDebugger(os: PlatformOS, containerId: string): Promise<string> {
        if (os === 'Windows') {
            return await this.vsdbgClient.getVsDbgVersion(DefaultDebuggerClient.debuggerVersion, DefaultDebuggerClient.debuggerWindowsRuntime);
        } else {
            const result = await this.dockerClient.exec(containerId, DefaultDebuggerClient.debuggerLinuxReleaseIdScript, { interactive: true });

            return await this.vsdbgClient.getVsDbgVersion(
                DefaultDebuggerClient.debuggerVersion,
                result.trim() === 'alpine'
                    ? DefaultDebuggerClient.debuggerLinuxAlpineRuntime
                    : DefaultDebuggerClient.debuggerLinuxDefaultRuntime);
        }
    }

    public async getDebuggerFolder(): Promise<string> {
        return await this.vsdbgClient.getVsDbgFolder();
    }
}
