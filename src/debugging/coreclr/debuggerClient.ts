/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { OSProvider } from '../../utils/LocalOSProvider';
import { PlatformOS } from '../../utils/platform';
import { DockerClient } from './CliDockerClient';
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
    // NOTES:
    //   - The result may contain line endings.
    //   - Windows seems to insist on double quotes.
    private static debuggerLinuxReleaseIdScript: string = '/bin/sh -c \'ID=default; if [ -e /etc/os-release ]; then . /etc/os-release; fi; echo $ID\'';
    private static debuggerLinuxReleaseIdScriptOnWindows: string = '/bin/sh -c \"ID=default; if [ -e /etc/os-release ]; then . /etc/os-release; fi; echo $ID\"';

    public constructor(
        private readonly dockerClient: DockerClient,
        private readonly osProvider: OSProvider,
        private readonly vsdbgClient: VsDbgClient) {
    }

    public async getDebugger(os: PlatformOS, containerId: string): Promise<string> {
        if (os === 'Windows') {
            return await this.vsdbgClient.getVsDbgVersion(DefaultDebuggerClient.debuggerVersion, DefaultDebuggerClient.debuggerWindowsRuntime);
        } else {
            const result = await this.dockerClient.exec(
                containerId,
                this.osProvider.os === 'Windows'
                    ? DefaultDebuggerClient.debuggerLinuxReleaseIdScriptOnWindows
                    : DefaultDebuggerClient.debuggerLinuxReleaseIdScript,
                { interactive: true });

            const path = await this.vsdbgClient.getVsDbgVersion(
                DefaultDebuggerClient.debuggerVersion,
                result.trim() === 'alpine'
                    ? DefaultDebuggerClient.debuggerLinuxAlpineRuntime
                    : DefaultDebuggerClient.debuggerLinuxDefaultRuntime);

            return this.osProvider.pathNormalize(os, path);
        }
    }

    public async getDebuggerFolder(): Promise<string> {
        return await this.vsdbgClient.getVsDbgFolder();
    }
}
