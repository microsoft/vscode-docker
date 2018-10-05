/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { PlatformOS } from '../../utils/platform';
import { VsDbgClient } from './vsdbgClient';

export interface DebuggerClient {
    getDebugger(os: PlatformOS): Promise<string>;
}

export class DefaultDebuggerClient {
    private static debuggerVersion: string = 'vs2017u5';
    private static debuggerLinuxRuntime: string = 'debian.8-x64';
    private static debuggerWindowsRuntime: string = 'win7-x64';

    constructor(private readonly vsdbgClient: VsDbgClient) {
    }

    public async getDebugger(os: PlatformOS): Promise<string> {
        return await this.vsdbgClient.getVsDbgVersion(
            DefaultDebuggerClient.debuggerVersion,
            os === 'Windows' ? DefaultDebuggerClient.debuggerWindowsRuntime : DefaultDebuggerClient.debuggerLinuxRuntime);
    }
}
